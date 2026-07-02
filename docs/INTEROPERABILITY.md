# Interoperability

Approved Open Azulejos records have stable, dereferenceable public identifiers.
Replace `{id}` with the UUID of an approved contribution.

| Representation | Stable URL | Media type |
| --- | --- | --- |
| CIDOC CRM-oriented JSON-LD | `https://openazulejos.vercel.app/archive/{id}` | `application/ld+json` |
| IIIF Presentation 3 manifest | `https://openazulejos.vercel.app/iiif/{id}/manifest` | `application/ld+json` with the IIIF profile |
| LIDO 1.1 record | `https://openazulejos.vercel.app/lido/{id}` | `application/xml` |

## Collections and research exports

Every collection route accepts `limit` from 1 to 200 and an opaque `cursor`.
The next page is exposed both in the response body where the format permits it
and through the HTTP `Link: <...>; rel="next"` header. Responses expose API
version `1` in `X-Open-Azulejos-API-Version`.

| Format | Collection URL |
| --- | --- |
| JSON-LD | `https://openazulejos.vercel.app/archive` |
| IIIF Collection | `https://openazulejos.vercel.app/iiif/collection` |
| LIDO 1.1 | `https://openazulejos.vercel.app/lido` |
| GeoJSON/WGS84 | `https://openazulejos.vercel.app/exports/azulejos.geojson` |
| CSV | `https://openazulejos.vercel.app/exports/azulejos.csv` |

For a durable page-by-page harvest with checksums:

```sh
npm run harvest -- --format geojson --output ../openazulejos-harvest
```

The harvester follows pagination without retaining the full archive in memory.
The 200-record page boundary requires 500 requests for 100,000 records and is
covered by the scale test suite.

The JSON-LD representation distinguishes the in-situ physical object (`E22`),
its place (`E53`), the observation activity (`E7`), and the photographic
document (`E31`). It is an initial application profile, not a claim that every
historic production, installation, or conservation event is already known.

The IIIF manifest uses the existing public derivative as a painting annotation.
It deliberately does not advertise an IIIF Image API service: region and scale
requests require a future dedicated image server. The manifest links to the
JSON-LD and LIDO descriptions through `seeAlso`.

LIDO output is generated against schema version 1.1. Rights statements and
attribution are emitted only when a photograph has explicit, recorded CC BY 4.0
consent. Existing images do not receive a license retroactively.

All representations are read-only, CORS-enabled, cacheable, and restricted to
approved `web-camera` records. Private originals and moderation data are never
included.
