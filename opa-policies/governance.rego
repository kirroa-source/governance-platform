# OPA/Rego Policy Bundle - Data Governance Policies
# This file contains Rego rules for GDPR, CCPA, PIPL, and DPDPA compliance

package governance

default allow = false

# Allow admins to read anything
allow if {
    input.action == "read"
    input.role == "admin"
}

# Allow read when explicit consent is given
allow if {
    input.action == "read"
    input.consent_given == true
}

# GDPR - Users in EU region must have explicit consent for marketing
gdpr_consent_check if {
    input.region == "EU"
    input.purpose == "marketing"
    input.consent_given == true
}
