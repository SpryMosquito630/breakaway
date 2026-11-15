export type HostedIdentity = { userId: string; idToken: string; appCheckToken: string };

/** Persisted native identity is restored once; concurrent uploads share bootstrap. */
export function createHostedIdentityProvider<
  User extends { uid: string; isAnonymous?: boolean },
>(sdk: {
  ready: () => Promise<void>;
  currentUser: () => User | null;
  signIn: () => Promise<User>;
  idToken: (user: User) => Promise<string>;
  appCheckToken: () => Promise<string>;
  signOut?: () => Promise<void>;
}) {
  let bootstrap: Promise<User> | null = null;
  let recovery: { uid: string; task: Promise<User> } | null = null;
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
    let user = await bootstrap;
    if (recovery?.uid === user.uid) user = await recovery.task;
    if (sdk.currentUser()?.uid !== user.uid) {
      bootstrap = null;
      throw new Error("Your analysis connection changed. Retry your video.");
    }
    // Attestation must succeed before a video leaves the device.
    const appCheckToken = await sdk.appCheckToken();
    let idToken: string;
    try {
      idToken = await sdk.idToken(user);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error ? error.code : null;
      if (
        !user.isAnonymous ||
        !sdk.signOut ||
        ![
          "auth/user-not-found",
          "auth/user-token-expired",
          "auth/invalid-user-token",
        ].includes(String(code))
      )
        throw error;
      if (recovery?.uid !== user.uid) {
        const expired = user;
        const task = (async () => {
          const current = sdk.currentUser();
          if (current && (current.uid !== expired.uid || !current.isAnonymous))
            throw new Error("Your analysis connection changed. Retry your video.");
          if (current) await sdk.signOut!();
          return sdk.signIn();
        })().catch((failure) => {
          bootstrap = null;
          recovery = null;
          throw failure;
        });
        recovery = { uid: expired.uid, task };
        bootstrap = task;
      }
      user = await recovery!.task;
      // One recovery only; network/disabled-user/App Check errors never recreate identity.
      idToken = await sdk.idToken(user);
    }
    if (!idToken || !appCheckToken || sdk.currentUser()?.uid !== user.uid)
      throw new Error(
        "Your analysis connection could not be verified. Retry your video.",
      );
    return { userId: user.uid, idToken, appCheckToken };
  };
}
