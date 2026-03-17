import { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '@/utils/constants';
import { NearbyUser } from '@/types';

interface NativeMapProps {
  latitude: number;
  longitude: number;
  nearbyUsers: NearbyUser[];
  onPinPress: (user: NearbyUser) => void;
}

export default function NativeMap({ latitude, longitude, nearbyUsers, onPinPress }: NativeMapProps) {
  const webViewRef = useRef<any>(null);
  const usersRef = useRef(nearbyUsers);
  usersRef.current = nearbyUsers;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${latitude}, ${longitude}], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Your location
    const youIcon = L.divIcon({
      html: '<div style="width:18px;height:18px;background:${COLORS.secondary};border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(78,205,196,0.6);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      className: '',
    });
    L.marker([${latitude}, ${longitude}], { icon: youIcon }).addTo(map);

    // 200m radius
    L.circle([${latitude}, ${longitude}], {
      radius: 1000,
      color: '${COLORS.primary}',
      fillColor: '${COLORS.primary}',
      fillOpacity: 0.06,
      weight: 1.5,
      dashArray: '6, 4',
    }).addTo(map);

    // Markers
    const markers = [];
    function updateMarkers(users) {
      markers.forEach(m => m.remove());
      markers.length = 0;

      users.forEach((user, index) => {
        const photoUrl = user.photo ? user.photo.url : 'https://placehold.co/60x60/FF6B6B/ffffff?text=' + user.firstName[0];
        const icon = L.divIcon({
          html: '<div style="width:50px;height:50px;border-radius:50%;border:3px solid ${COLORS.primary};overflow:hidden;background:white;box-shadow:0 2px 10px rgba(255,107,107,0.5);"><img src="' + photoUrl + '" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src=\\'https://placehold.co/60x60/FF6B6B/ffffff?text=' + user.firstName[0] + '\\'"/></div>',
          iconSize: [50, 50],
          iconAnchor: [25, 25],
          className: '',
        });

        const marker = L.marker([user.location.lat, user.location.lng], { icon }).addTo(map);
        marker.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pin_press', index: index }));
        });
        markers.push(marker);
      });
    }

    // Listen for user data from React Native
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update_users') {
          updateMarkers(data.users);
        }
      } catch(e) {}
    });

    // Also handle document message for Android
    document.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update_users') {
          updateMarkers(data.users);
        }
      } catch(e) {}
    });
  </script>
</body>
</html>
  `;

  useEffect(() => {
    if (webViewRef.current && nearbyUsers.length > 0) {
      const msg = JSON.stringify({ type: 'update_users', users: nearbyUsers });
      webViewRef.current.postMessage(msg);
    }
  }, [nearbyUsers]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'pin_press' && usersRef.current[data.index]) {
        onPinPress(usersRef.current[data.index]);
      }
    } catch {}
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => {
          if (nearbyUsers.length > 0) {
            const msg = JSON.stringify({ type: 'update_users', users: nearbyUsers });
            webViewRef.current?.postMessage(msg);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
