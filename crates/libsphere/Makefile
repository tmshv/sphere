OSM := "planet.osm.pbf"

create-geojsonl-countries:
	osmium tags-filter --overwrite -o assets/tmp-countries.osm.pbf $(OSM) n/place=country
	osmium export --progress --overwrite assets/tmp-countries.osm.pbf -o assets/geojson-files/osm-countries.geojsonl -f geojsonseq --add-unique-id=type_id
	rm assets/tmp-counties.osm.pbf
