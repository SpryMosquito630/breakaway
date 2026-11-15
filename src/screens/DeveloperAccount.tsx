import { useApp } from "../state/AppState";
import { AccountScreen } from "./Connected";
export function AccountRoute() {
  const { data, update, catalog } = useApp();
  return (
    <AccountScreen
      data={data}
      catalog={catalog}
      onRestore={
        data.active
          ? undefined
          : (incoming) =>
              update((current) => {
                if (current.active)
                  throw new Error(
                    "Finish your current practice before restoring cloud progress.",
                  );
                return {
                  ...incoming,
                  profile: { ...incoming.profile, ageBand: current.profile.ageBand },
                };
              })
      }
    />
  );
}
