export const msalConfig = {
  auth: {
    clientId: "624fdd0e-67d1-4f65-8a19-036f4c6879c6",

    authority: "https://login.microsoftonline.com/deb8c5e9-54cd-477d-be23-71cb103b773f",
    knownAuthorities: ["login.microsoftonline.com"],
    redirectUri: "https://medical-risk-render.onrender.com",
    postLogoutRedirectUri: "https://medical-risk-render.onrender.com"
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"]
};
