import type { PlayerStyleId } from "../domain/playerStyles";

/** Static native requires, keyed by catalog ID so carousel ordering never changes faces. */
export const playerStyleImages = {
  "kevin-de-bruyne": require("../../assets/player-styles/kevin-de-bruyne.jpg"),
  pedri: require("../../assets/player-styles/pedri.jpg"),
  "sergio-busquets": require("../../assets/player-styles/sergio-busquets.jpg"),
  "declan-rice": require("../../assets/player-styles/declan-rice.jpg"),
  "erling-haaland": require("../../assets/player-styles/erling-haaland.jpg"),
  "harry-kane": require("../../assets/player-styles/harry-kane.jpg"),
  "kylian-mbappe": require("../../assets/player-styles/kylian-mbappe.jpg"),
  "mohamed-salah": require("../../assets/player-styles/mohamed-salah.jpg"),
  "bukayo-saka": require("../../assets/player-styles/bukayo-saka.jpg"),
  "virgil-van-dijk": require("../../assets/player-styles/virgil-van-dijk.jpg"),
  "william-saliba": require("../../assets/player-styles/william-saliba.jpg"),
  "jules-kounde": require("../../assets/player-styles/jules-kounde.jpg"),
  "achraf-hakimi": require("../../assets/player-styles/achraf-hakimi.jpg"),
  "trent-alexander-arnold": require("../../assets/player-styles/trent-alexander-arnold.jpg"),
  "manuel-neuer": require("../../assets/player-styles/manuel-neuer.jpg"),
  "alisson-becker": require("../../assets/player-styles/alisson-becker.jpg"),
  "thibaut-courtois": require("../../assets/player-styles/thibaut-courtois.jpg"),
  "andrew-robertson": require("../../assets/player-styles/andrew-robertson.jpg"),
  "theo-hernandez": require("../../assets/player-styles/theo-hernandez.jpg"),
  "alphonso-davies": require("../../assets/player-styles/alphonso-davies.jpg"),
} satisfies Record<PlayerStyleId, number>;
