"""Publica recortes reais de unidades de saúde sem depender de um backend do site.

Uso: python scripts/update-health-data.py [--cache-dir /tmp/saude360-raw]
Só substitui os arquivos publicados depois de concluir e validar todas as fontes.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import math
import pathlib
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CNES = 'https://apidadosabertos.saude.gov.br/cnes/estabelecimentos'
WFS = 'https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs'
CITIES = {'3550308': 'São Paulo', '3513801': 'Diadema', '3529401': 'Mauá', '3543303': 'Ribeirão Pires', '3544103': 'Rio Grande da Serra', '3547809': 'Santo André', '3548708': 'São Bernardo do Campo', '3548807': 'São Caetano do Sul', '3518800': 'Guarulhos', '3552502': 'Suzano'}


def text(value):
    return '' if value is None else str(value).strip()


def normalized(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value) if unicodedata.category(c) != 'Mn').lower()


def in_scope(name, kind):
    value = normalized(name)
    restricted = r'(^|[^a-z])(presidio|prisional|penit|penitenciaria|penitenciario|detencao)([^a-z]|$)|fundacao casa'
    if re.search(restricted, value):
        return False
    if kind == 'UPA':
        return bool(re.search(r'(^|[^a-z])upa([^a-z]|$)|unidade de pronto atendimento', value))
    return bool(re.search(r'(^|[^a-z])(ubs|usf|esf)([^a-z]|$)|unidade basica|saude da familia|posto de saude|centro de saude|clinica da familia', value))


def coordinates(lat, lon):
    try:
        lat, lon = float(lat), float(lon)
        return (lat, lon) if math.isfinite(lat) and math.isfinite(lon) and -34 <= lat <= 6 and -74 <= lon <= -34 else None
    except (ValueError, TypeError):
        return None


def get_json(url, cache_dir=None):
    cache_path = cache_dir / (hashlib.sha256(url.encode()).hexdigest() + '.json') if cache_dir else None
    if cache_path and cache_path.exists():
        saved = json.loads(cache_path.read_text())
        return saved['data'], saved['retrievedAt']
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Saude360-data-update/1.0 (+https://github.com/Murilovsgama/Saude360)'})
            with urllib.request.urlopen(request, timeout=45) as response:
                data = json.load(response)
            retrieved = datetime.datetime.now(datetime.timezone.utc).isoformat()
            if cache_path:
                cache_dir.mkdir(parents=True, exist_ok=True)
                cache_path.write_text(json.dumps({'retrievedAt': retrieved, 'data': data}, ensure_ascii=False))
            return data, retrieved
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            if attempt == 2:
                raise
            time.sleep(5 * 2 ** attempt)
    raise RuntimeError('A consulta não foi concluída.')


def collect_cnes(city_id, cache_dir):
    units, seen, dates, sources = [], set(), [], []
    skipped = 0
    for kind, code in [('UBS', 2), ('UPA', 73)]:
        for offset in range(0, 2000, 20):
            url = CNES + '?' + urllib.parse.urlencode({'codigo_municipio': city_id[:6], 'codigo_tipo_unidade': code, 'limit': 20, 'offset': offset, 'status': 1})
            data, retrieved = get_json(url, cache_dir)
            records = data.get('estabelecimentos')
            if not isinstance(records, list):
                raise ValueError(f'Resposta inválida de {city_id}')
            dates.append(retrieved)
            if offset == 0:
                sources.append(url)
            page_ids = set()
            for item in records:
                cnes = text(item.get('codigo_cnes')).zfill(7)
                record_key = (code, cnes)
                if record_key in seen or record_key in page_ids:
                    raise ValueError(f'Paginação repetida em {city_id}, offset {offset}')
                page_ids.add(record_key)
                if str(item.get('codigo_municipio')) != city_id[:6] or item.get('codigo_tipo_unidade') != code:
                    raise ValueError('A fonte não aplicou o filtro do município ou tipo.')
                name = text(item.get('nome_fantasia'))
                if text(item.get('estabelecimento_faz_atendimento_ambulatorial_sus')).upper() != 'SIM':
                    continue
                if not in_scope(name, kind):
                    continue
                location = coordinates(item.get('latitude_estabelecimento_decimo_grau'), item.get('longitude_estabelecimento_decimo_grau'))
                if not name or not location:
                    skipped += 1
                    continue
                units.append({'id': f'cnes/{cnes}', 'name': name, 'type': kind, 'latitude': location[0], 'longitude': location[1], 'street': ', '.join(filter(None, [text(item.get('endereco_estabelecimento')), text(item.get('numero_estabelecimento'))])), 'neighborhood': text(item.get('bairro_estabelecimento')), 'phone': text(item.get('numero_telefone_estabelecimento')), 'hours': text(item.get('descricao_turno_atendimento')), 'operator': text(item.get('nome_razao_social')), 'cnes': cnes, 'editedAt': text(item.get('data_atualizacao')), 'sourceUrl': f'{CNES}/{cnes}', 'dataSource': 'cnes'})
            seen.update(page_ids)
            if len(records) < 20:
                break
        else:
            raise ValueError('Limite de paginação atingido; nenhuma publicação foi feita.')
    return {'schemaVersion': 1, 'cityId': city_id, 'cityName': CITIES[city_id], 'collectedAt': min(dates), 'collectionFinishedAt': max(dates), 'sourceName': 'CNES · Ministério da Saúde', 'sourceUrls': sources, 'excludedWithoutCoordinates': skipped, 'units': sorted(units, key=lambda u: u['name'])}


def collect_capital(cache_dir):
    units, dates, sources = [], [], []
    skipped = 0
    for kind, layer in [('UBS', 'equipamento_saude_ubs_posto_centro'), ('UPA', 'equipamento_saude_urgencia_emergencia')]:
        url = WFS + '?' + urllib.parse.urlencode({'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature', 'typeName': 'geoportal:' + layer, 'outputFormat': 'application/json', 'srsName': 'EPSG:4326'})
        data, retrieved = get_json(url, cache_dir)
        features = data.get('features')
        if not isinstance(features, list) or data.get('numberMatched') != len(features):
            raise ValueError('A fonte do GeoSampa retornou uma coleção incompleta.')
        dates.append(retrieved)
        sources.append(url)
        for feature in features:
            props = feature['properties']
            name = text(props.get('nm_equipamento'))
            if props.get('nm_esfera_administrativa_equipamento') not in ('Municipal', 'Estadual', 'Federal'):
                continue
            if kind == 'UBS' and props.get('nm_tipo_equipamento') != 'Unidade Básica de Saúde':
                continue
            if kind == 'UPA' and not re.search(r'(^|[^a-z])upa([^a-z]|$)|unidade de pronto atendimento', normalized(name)):
                continue
            geometry = feature.get('geometry') or {}
            point = geometry.get('coordinates', [])
            location = coordinates(point[1], point[0]) if geometry.get('type') == 'Point' and len(point) >= 2 else None
            if not name or not location:
                skipped += 1
                continue
            identifier = str(props['cd_identificador'])
            units.append({'id': f'geosampa/{kind.lower()}/{identifier}', 'name': name, 'type': kind, 'latitude': location[0], 'longitude': location[1], 'street': text(props.get('tx_endereco_equipamento')), 'neighborhood': text(props.get('nm_bairro_equipamento')), 'phone': text(props.get('tx_numero_telefone')), 'hours': text(props.get('tx_horario_funcionamento')), 'operator': text(props.get('nm_esfera_administrativa_equipamento')), 'cnes': '', 'editedAt': '', 'sourceUrl': url + '&featureID=' + urllib.parse.quote(feature['id']), 'dataSource': 'geosampa'})
    return {'schemaVersion': 1, 'cityId': '3550308', 'cityName': CITIES['3550308'], 'collectedAt': min(dates), 'collectionFinishedAt': max(dates), 'sourceName': 'GeoSampa · Prefeitura de São Paulo', 'sourceUrls': sources, 'excludedWithoutCoordinates': skipped, 'units': sorted(units, key=lambda u: u['name'])}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache-dir', type=pathlib.Path)
    args = parser.parse_args()
    # Coletas independentes, com concorrência limitada e paginação sequencial por município.
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs = [pool.submit(collect_capital, args.cache_dir)]
        jobs += [pool.submit(collect_cnes, city, args.cache_dir) for city in CITIES if city != '3550308']
        datasets = [job.result() for job in jobs]
    for data in datasets:
        data['complete'] = True
        data['unitCount'] = len(data['units'])
        data['revision'] = hashlib.sha256(json.dumps({'units': data['units'], 'collectedAt': data['collectedAt']}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        if not data['units'] or len({unit['id'] for unit in data['units']}) != len(data['units']):
            raise ValueError(f'Recorte vazio ou duplicado: {data["cityName"]}')
    target = ROOT / 'public/data/health-units'
    target.mkdir(parents=True, exist_ok=True)
    for data in datasets:
        path = target / (data['cityId'] + '.json')
        temporary = path.with_suffix('.tmp')
        temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
        temporary.replace(path)
        print(data['cityName'], len(data['units']), 'unidades;', data['excludedWithoutCoordinates'], 'sem coordenadas', flush=True)
    coverage = [{'id': data['cityId'], 'nome': data['cityName'], 'collectedAt': data['collectedAt'], 'units': len(data['units']), 'sourceName': data['sourceName'], 'revision': data['revision']} for data in sorted(datasets, key=lambda d: d['cityName'])]
    (ROOT / 'src/shared/data/publishedCities.json').write_text(json.dumps(coverage, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
