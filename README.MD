# Swagger to ReadMe

The purpose of this repository is to prepare the HelloAsso OpenAPI file from Swagger in order to update our [ReadMe](https://dev.helloasso.com/reference/obtenir-un-accesstoken-copy-1)

### How it works:

- Download the HelloAsso OpenAPI file from Swagger.
- Merge the file with `changes.json` (essentially translations).
- Generate a new file.
- Open a PR on [helloasso-open-api](https://github.com/HelloAsso/helloasso-open-api)

### Automation with GitHub Actions

This process can be launched manually and is also automated via a GitHub Action. The workflow runs every Monday to ensure the ReadMe stays up to date.