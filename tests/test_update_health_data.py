import importlib.util
import pathlib
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

path = pathlib.Path(__file__).resolve().parents[1] / 'scripts/update-health-data.py'
spec = importlib.util.spec_from_file_location('update_health_data', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def record(index):
    return {'codigo_cnes': 2000000 + index, 'codigo_municipio': 351880, 'codigo_tipo_unidade': 2,
            'nome_fantasia': f'UBS {index}', 'estabelecimento_faz_atendimento_ambulatorial_sus': 'SIM',
            'latitude_estabelecimento_decimo_grau': -23.46, 'longitude_estabelecimento_decimo_grau': -46.53}


class CollectionTests(unittest.TestCase):
    def test_offset_advances_by_records_instead_of_pages(self):
        urls = []

        def fetch(url, _cache):
            urls.append(url)
            params = parse_qs(urlparse(url).query)
            if params['codigo_tipo_unidade'] == ['73']:
                records = []
            elif params['offset'] == ['0']:
                records = [record(index) for index in range(20)]
            else:
                records = [record(20)]
            return {'estabelecimentos': records}, '2026-10-28T12:00:00Z'

        with patch.object(module, 'get_json', side_effect=fetch):
            data = module.collect_cnes('3518800', None)
        self.assertEqual(len(data['units']), 21)
        self.assertEqual([parse_qs(urlparse(url).query)['offset'][0] for url in urls], ['0', '20', '0'])

    def test_restricted_and_specialized_services_are_outside_the_guide_scope(self):
        for name in ['CENTRO DE DETENCAO PROVISORIA', 'UBS PENITENCIARIA', 'PENIT JOSE PARADA NETO', 'CENTRO DE ESPECIALIDADES MEDICAS', 'SAD SERVICO DE ATENDIMENTO DOMICILIAR']:
            self.assertFalse(module.in_scope(name, 'UBS'))
        self.assertTrue(module.in_scope('CLINICA DA FAMILIA AGUA AZUL', 'UBS'))
        self.assertTrue(module.in_scope('UPA TABOAO', 'UPA'))
        self.assertFalse(module.in_scope('PRONTO ATENDIMENTO JARDIM', 'UPA'))

    def test_repeated_page_is_rejected(self):
        with patch.object(module, 'get_json', return_value=({'estabelecimentos': [record(index) for index in range(20)]}, '2026-10-28T12:00:00Z')):
            with self.assertRaisesRegex(ValueError, 'Paginação repetida'):
                module.collect_cnes('3518800', None)

    def test_filters_do_not_include_non_sus_records(self):
        rejected = record(1)
        rejected['estabelecimento_faz_atendimento_ambulatorial_sus'] = 'NAO'
        responses = [({'estabelecimentos': [record(0), rejected]}, '2026-10-28T12:00:00Z'), ({'estabelecimentos': []}, '2026-10-28T12:00:00Z')]
        with patch.object(module, 'get_json', side_effect=responses):
            data = module.collect_cnes('3518800', None)
        self.assertEqual([unit['name'] for unit in data['units']], ['UBS 0'])


if __name__ == '__main__':
    unittest.main()
