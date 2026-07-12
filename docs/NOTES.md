# Development Notes

## Startup for Local Development

Start multiple terminals to set all of this up.

Terminal 1 - Start local database

- `docker compose up postgres`

Terminal 2 - Start local webserver

- `pnpm dev:web`
- Make sure your `.env` is referencing the same `<url>:<port>` that is used.
- Open: http://localhost:3000

Terminal 3 - CLI testing

- `pnpm --filter @appsec-workbench/cli appsec modules list`
- `pnpm --filter @appsec-workbench/cli appsec run demo-repo-inventory`
- `pnpm --filter @appsec-workbench/cli appsec evaluate`

Optional: GitHub sync

- Run sync for repo-inventory: `pnpm --filter @appsec-workbench/cli appsec run repo-inventory`
- Run the scheduled sync entrypoint: `pnpm --filter @appsec-workbench/cli appsec sync scheduled`

To stop services

`docker compose down`

## Threat Modeling

- OWASP threat stories - This has some example threat models written in Gherkin-test-like syntax
    - [https://github.com/owasp-cloud-security/owasp-cloud-security](https://github.com/owasp-cloud-security/owasp-cloud-security)
- Threat modeling as code, Omer Levi Hevroni
    - [https://www.omerlh.info/2019/01/19/threat-modeling-as-code/](https://www.omerlh.info/2019/01/19/threat-modeling-as-code/)

- Other threat modeling links
    - [https://www.mitre.org/sites/default/files/publications/pr_18-1613-ngci-enterprise-threat-model-technical-report.pdf](https://www.mitre.org/sites/default/files/publications/pr_18-1613-ngci-enterprise-threat-model-technical-report.pdf)
    - [https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-getting-started](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-getting-started)
    - [https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
    - [https://www.cs.montana.edu/courses/csci476/topics/threat_modeling.pdf](https://www.cs.montana.edu/courses/csci476/topics/threat_modeling.pdf)