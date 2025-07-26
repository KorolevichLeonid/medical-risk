export const msalConfig = {
  auth: {
    clientId: "624fdd0e-67d1-4f65-8a19-036f4c6879c6",
    authority: "https://korolevichleonid.ciamlogin.com/deb8c5e9-54cd-477d-be23-71cb103b773f/v2.0",
    knownAuthorities: ["korolevichleonid.ciamlogin.com"],
    redirectUri: "https://brave-grass-08892c503.1.azurestaticapps.net/auth",
    postLogoutRedirectUri: "https://brave-grass-08892c503.1.azurestaticapps.net/auth"
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"]
};