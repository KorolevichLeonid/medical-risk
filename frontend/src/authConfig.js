export const msalConfig = {
  auth: {
    clientId: "e59f02df-4e58-4888-8d75-8a6ed15a46e4",
    authority: "https://korolevichleonid.ciamlogin.com/deb8c5e9-54cd-477d-be23-71cb103b773f",
    knownAuthorities: ["korolevichleonid.ciamlogin.com"],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"]
};