export type SocialLoginProvider =
    | "Google"
    | "GitHub"
    | "Microsoft"
    | "Slack"
    | "LinkedIn"
    | "Salesforce"
    | "Xero"
    | "QuickBooks Online"
export type SamlLoginProvider = "Google" | "Rippling" | "OneLogin" | "JumpCloud" | "Okta" | "Azure" | "Duo" | "Generic"

export type LoginMethod =
    | {
          loginMethod: "password"
      }
    | {
          loginMethod: "magic_link"
      }
    | {
          loginMethod: "social_sso"
          provider: SocialLoginProvider
      }
    | {
          loginMethod: "email_confirmation_link"
      }
    | {
          loginMethod: "saml_sso"
          provider: SamlLoginProvider
          orgId: string
      }
    | {
          loginMethod: "impersonation"
      }
    | {
          loginMethod: "generated_from_backend_api"
      }
    | {
          loginMethod: "unknown"
      }

export type InternalLoginMethod =
    | {
          login_method: "password"
      }
    | {
          login_method: "magic_link"
      }
    | {
          login_method: "social_sso"
          provider: SocialLoginProvider
      }
    | {
          login_method: "email_confirmation_link"
      }
    | {
          login_method: "saml_sso"
          provider: SamlLoginProvider
          org_id: string
      }
    | {
          login_method: "impersonation"
      }
    | {
          login_method: "generated_from_backend_api"
      }
    | {
          login_method: "unknown"
      }
