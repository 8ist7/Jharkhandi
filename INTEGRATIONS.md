# External Integration Audit 

| Integration | Status | Notes |
|---|---|---|
| Local trained classifier | LIVE | Bundled model/training data; reviewer correction endpoint exists |
| SQLite persistence | LIVE | Default local persistence |
| OpenStreetMap | LIVE | Map embed/tiles require network |
| Nominatim reverse geocoding | OPTIONAL | Called only when GPS/context network is available |
| Open-Meteo | OPTIONAL | Adds live environmental context when available |
| Local disk evidence storage | LIVE | Prototype local storage |
| Government SSO | NOT IMPLEMENTED | Production integration required |
| Aadhaar | NOT IMPLEMENTED | No false claim |
| DigiLocker | NOT IMPLEMENTED | No false claim |
| SMS | NOT IMPLEMENTED | In-app notifications only |
| Email | NOT IMPLEMENTED | In-app notifications only |
| Official government APIs | NOT IMPLEMENTED | No credentials bundled |
| External AI provider | NOT IMPLEMENTED | Local deterministic/trained fallback is used |
| Cloud object storage | NOT IMPLEMENTED | Local disk only |

Runtime status is also available through `GET /api/integrations`.
