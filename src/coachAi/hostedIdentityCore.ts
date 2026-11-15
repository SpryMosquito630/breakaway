export type HostedIdentity = { userId: string; idToken: string; appCheckToken: string };

/** Persisted native identity is restored once; concurrent uploads share bootstrap. */
export function createHostedIdentityProvider<User extends { uid: string }>(sdk: {
  ready: () => Promise<void>;
  currentUser: () => User | null;
  signIn: () => Promise<User>;
  idToken: (user: User) => Promise<string>;
  appCheckToken: () => Promise<string>;
}) {
  let bootstrap: Promise<User> | null = null;
  return async (): Promise<HostedIdentity> => {
    if (!bootstrap) {
      bootstrap = (async () => {
        await sdk.ready();
        return sdk.currentUser() ?? sdk.signIn();
      })().catch((error) => {
        bootstrap = null;
        throw error;
      });
    }
    const user = await bootstrap;
    if (sdk.currentUser()?.uid !== user.uid) {
      bootstrap = null;
      throw new Error("Your analysis connection changed. Retry your video.");
    }
    // Attestation must succeed before a video leaves the device.
    const appCheckToken = await sdk.appCheckToken();
    const idToken = await sdk.idToken(user);
    if (!idToken || !appCheckToken || sdk.currentUser()?.uid !== user.uid)
      throw new Error(
        "Your analysis connection could not be verified. Retry your video.",
      );
    return { userId: user.uid, idToken, appCheckToken };
  };
}
