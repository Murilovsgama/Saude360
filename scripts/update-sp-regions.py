"""Atualiza os limites simplificados das regiões da capital a partir do GeoSampa.

Uso: python scripts/update-sp-regions.py [arquivo.geojson]
Sem argumento, consulta o WFS público da Prefeitura. Não é executado pelo site.
"""
import datetime
import json
import math
import pathlib
import sys
import urllib.request

SOURCE = ('https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?'
          'service=WFS&version=1.0.0&request=GetFeature&typeName=geoportal:subprefeitura&'
          'outputFormat=application/json&srsName=EPSG:4326')
TOLERANCE = 0.00005  # Cerca de cinco metros; uso para busca, não para fins cadastrais.


def distance(point, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    if dx == dy == 0:
        return math.dist(point[:2], start[:2])
    t = max(0, min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
    return math.dist(point[:2], [start[0] + t * dx, start[1] + t * dy])


def simplify(points):
    if len(points) <= 2:
        return points
    index, maximum = max(((i, distance(p, points[0], points[-1])) for i, p in enumerate(points[1:-1], 1)), key=lambda item: item[1])
    if maximum <= TOLERANCE:
        return [points[0], points[-1]]
    return simplify(points[:index + 1])[:-1] + simplify(points[index:])


def main():
    if len(sys.argv) > 1:
        data = json.loads(pathlib.Path(sys.argv[1]).read_text())
    else:
        with urllib.request.urlopen(SOURCE, timeout=60) as response:
            data = json.load(response)
    features = data['features']
    if len(features) != 32 or data.get('numberMatched', 32) not in (32, '32'):
        raise ValueError('A fonte não retornou as 32 subprefeituras esperadas.')
    groups = {}
    for feature in features:
        properties = feature['properties']
        name = properties['nm_regiao_05']
        if name not in ('Centro', 'Leste', 'Norte', 'Oeste', 'Sul'):
            raise ValueError(f'Região desconhecida: {name}')
        region = groups.setdefault(name, {'id': name.lower(), 'label': name if name == 'Centro' else f'Zona {name}', 'polygons': [], 'bounds': [90, 180, -90, -180]})
        geometry = feature['geometry']
        polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
        for polygon in polygons:
            rings = []
            for ring in polygon:
                for lon, lat, *_ in ring:
                    region['bounds'] = [min(region['bounds'][0], lat), min(region['bounds'][1], lon), max(region['bounds'][2], lat), max(region['bounds'][3], lon)]
                simple = simplify(ring)
                rings.append([[round(p[0], 6), round(p[1], 6)] for p in (simple if len(simple) >= 4 else ring)])
            region['polygons'].append(rings)
    result = {'source': SOURCE, 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).date().isoformat(), 'toleranceDegrees': TOLERANCE, 'regions': [groups[name] for name in sorted(groups)]}
    target = pathlib.Path(__file__).resolve().parent.parent / 'src/shared/data/saoPauloRegions.json'
    target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{target.name}: {len(result["regions"])} regiões, {target.stat().st_size} bytes')


if __name__ == '__main__':
    main()
