function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center : { lat: -8.65, lng: 115.22 },
        zoom : 9,
    });

    const marker = new google.maps.Marker({
        position: { lat: -8.664931426158962, lng: 115.20680890066842},
        map: map,
        title: "My Location",
    });

    const infoWondow = new google.maps.InfoWindow({
        content: "<h2>Ngurah's Cribs</h2><p>Jl. Imam Bonjol no.68, Pemecutan, Denpasar Barat, Kota Denpasar, Bali 80119</p>"
    });

    marker.addListener('click', () => {
        infoWondow.open(map, marker);
    });
}

window.onload = initMap;