# LACRIMAE — BRANCH STATUS

Dernière mise à jour : 2026-08-28.

| Branche | URL | Commit de référence | Fonction | État | Prochaine action |
|---|---|---|---|---|---|
| `main` | https://github.com/kioka8877-ux/LACRIMAE/tree/main | `6fd0de2` | Base historique | Stable | Ne pas modifier pour les tests actuels |
| `dev4` | https://github.com/kioka8877-ux/LACRIMAE/tree/dev4 | `5c7d7a0` | Pipeline historique et normalisation YouTube | Stable historique | Référence uniquement |
| `dev7` | https://github.com/kioka8877-ux/LACRIMAE/tree/dev7 | `edbc24b` + continuité | Hybrid Narrative et Audio Timeline v2 | Production testée ; artifacts locaux à restaurer si nécessaire | Reprendre selon le gate demandé |
| `dev8` | https://github.com/kioka8877-ux/LACRIMAE/tree/dev8 | `159f264` | Reveal Compilation | Code poussé ; test réel restant | F00-E puis F00-MUSIC |
| `dev9` | https://github.com/kioka8877-ux/LACRIMAE/tree/dev9 | `8b181fe` | Ranking | Code poussé ; test réel restant | F00-E puis F00-F |

## Dev7 — état détaillé

Le dernier commit de production distant est `edbc24b`. Le sandbox précédent contenait des modifications locales et des artifacts Avengers/Stan Lee non présents dans ce commit. Les documents de continuité sont maintenant ajoutés à dev7. Les médias doivent être récupérés séparément et enregistrés dans `TRANSFER_LOG.md`.

## Dev8 — état détaillé

Le code Reveal est poussé dans `159f264`. Le workflow prévu est F00-E → F00-MUSIC → F03 Preview → codex → F04. Le test avec des sources réelles n’est pas encore validé.

## Dev9 — état détaillé

Le code Ranking est poussé dans `8b181fe`. F00-E reste inchangé ; F00-F produit le manifeste Ranking ; F03 expose la Preview Ranking ; F04 reprend le renderer PICTOR. Le premier test réel avec six rangs reste à faire.

## Règle de mise à jour

Après chaque gate, mettre à jour le présent fichier, le TODO de continuation, le journal de campagne et le registre de transferts. Toujours inscrire le commit ou le run qui a produit l’état.
