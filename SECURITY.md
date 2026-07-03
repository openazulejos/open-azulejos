# Security policy

Do not open public issues for vulnerabilities, leaked credentials, private
source-image exposure, authorization bypasses, or personal-data incidents.

Until a dedicated security mailbox is published, use GitHub private
vulnerability reporting on the project repository. Include affected URL,
reproduction steps, impact, and whether data may have been accessed.

Maintainers should acknowledge a report within 72 hours, rotate exposed secrets
immediately, preserve logs, assess notification duties, and publish a concise
advisory after remediation when disclosure is safe.

Contribution receipt tokens are bearer secrets. Clients store them locally and
send them only in POST request bodies. The server stores SHA-256 hashes, compares
them in constant time, and must never log, publish, or place raw tokens in URLs.
