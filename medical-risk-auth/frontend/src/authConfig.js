export const msalConfig = {
  auth: {
    clientId: "76428447-1df3-4708-b641-ac110fc0dd0b",
    authority: "https://korolevichleonid.ciamlogin.com/deb8c5e9-54cd-477d-be23-71cb103b773f/v2.0",
    knownAuthorities: ["korolevichleonid.ciamlogin.com"],
    redirectUri: "https://medical-risk-render-f.onrender.com/login",
    postLogoutRedirectUri: "https://medical-risk-render-f.onrender.com"
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"]
};
