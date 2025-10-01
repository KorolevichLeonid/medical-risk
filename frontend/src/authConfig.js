export const msalConfig = {
  auth: {
    clientId: "624fdd0e-67d1-4f65-8a19-036f4c6879c6",
    authority: "https://korolevichleonid.ciamlogin.com/deb8c5e9-54cd-477d-be23-71cb103b773f/v2.0",
    knownAuthorities: ["korolevichleonid.ciamlogin.com"],
    //redirectUri: "http://localhost:3000",
    //postLogoutRedirectUri: "http://localhost:3000"
    // Production URLs (update when deploying):
    redirectUri: "https://polite-desert-0c5ab6400.2.azurestaticapps.net",
    postLogoutRedirectUri: "https://polite-desert-0c5ab6400.2.azurestaticapps.net"
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"]
};
