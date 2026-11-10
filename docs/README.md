# MotoSecure documentation

Prepared for institutional review and potential pilot deployment. Baseline: the source archive as
reviewed on 2 November 2026.

| Document | File |
|---|---|
| System Architecture Document | `01_MotoSecure_System_Architecture_Document` (.docx / .pdf) |
| Software Requirements Specification | `02_MotoSecure_Software_Requirements_Specification` (.docx / .pdf) |
| Security, Privacy and Governance Policy | `03_MotoSecure_Security_Privacy_and_Governance_Policy` (.docx / .pdf) |
| Security Assessment Report | `04_MotoSecure_Security_Assessment_Report` (.docx / .pdf) |

Other contents:

- `evidence/` - recorded results: unit tests, static analysis before and after, and the route inventory
  generated from the source.
- `REVIEW_CHANGES.md` - every file added, modified or removed by the review.
- `build/` - the scripts that generate the documents (`node build.js`; needs the `docx` package and
  LibreOffice). Tables for routes, test counts and scan results are generated from `evidence/`, so
  they follow the code.

**Important:** the documents distinguish tests that were *executed* from tests that were *written but
not run*, and checks that were only *reviewed*. Do not present them as a penetration test,
certification or compliance assessment; they are not.
