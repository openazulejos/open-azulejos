# Interoperability

Approved Open Azulejos records have stable, dereferenceable public identifiers.
Replace `{id}` with the UUID of an approved contribution.

| Representation | Stable URL | Media type |
| --- | --- | --- |
| CIDOC CRM-oriented JSON-LD | `https://openazulejos.vercel.app/archive/{id}` | `application/ld+json` |
| IIIF Presentation 3 manifest | `https://openazulejos.vercel.app/iiif/{id}/manifest` | `application/ld+json` with the IIIF profile |
| LIDO 1.1 record | `https://openazulejos.vercel.app/lido/{id}` | `application/xml` |

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
