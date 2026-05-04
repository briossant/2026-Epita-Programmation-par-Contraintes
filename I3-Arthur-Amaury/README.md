# CP-LLM : Modélisation CP-SAT assistée par LLM

Projet I3 — Pipeline qui transforme une description en langage naturel d'un problème
d'optimisation en un modèle CP-SAT exécutable, vérifie la correction du modèle généré,
et compare avec une modélisation manuelle de référence.

## Architecture

Pipeline en 4 étages, chacun isolément testable :

| # | Étage         | Rôle                                                             | LLM ? |
|---|---------------|------------------------------------------------------------------|-------|
| 1 | `analyzer`    | NL → structure (type, objectif, entités, paramètres)             | oui   |
| 2 | `variables`   | Structure → liste de variables de décision typées avec bornes    | oui   |
| 3 | `constraints` | Structure + variables → liste de contraintes formalisées         | oui   |
| 4 | `codegen`     | Variables + contraintes → script Python `ortools.sat.python`     | oui   |

Chaque étage produit un artefact validable. Si un benchmark échoue, on sait à quel
étage la chaîne casse — c'est ce qui permet l'analyse de modes d'échec.

## Layout

```
cp-llm-project/
├── cp_llm/
│   ├── schemas.py        # Pydantic : ProblemAnalysis, VariableSpec, ConstraintSpec
│   ├── llm_client.py     # Wrapper Mistral
│   ├── pipeline.py       # Étages 1-3 (analyse, variables, contraintes)
│   ├── codegen.py        # Étage 4 (génération Python)
│   ├── verification.py   # Vérif syntaxique + faisabilité + sémantique
│   └── runner.py         # Orchestre les 4 étages + vérif
├── benchmark/
│   ├── problems/         # Descriptions NL (.txt)
│   └── references/       # Modèles CP-SAT manuels (.py) pour comparaison
├── scripts/
│   ├── run_pipeline.py   # Pipeline sur un problème unique
│   └── run_benchmark.py  # Benchmark complet + rapport
└── tests/
    └── test_references.py  # Vérifie que les modèles manuels tournent
```

## Setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # puis remplir MISTRAL_API_KEY
```

Le pipeline est **provider-agnostique** : Mistral (free tier), Anthropic, ou un Mock
offline. Choix du provider via `--provider mistral|anthropic|mock`.

Cle Mistral : créer un compte sur https://console.mistral.ai puis copier la cle dans
`.env` (variable `MISTRAL_API_KEY`).

## Usage

### Pipeline sur un problème unique

```bash
# Mistral (defaut, cle MISTRAL_API_KEY requise)
python scripts/run_pipeline.py benchmark/problems/nqueens.txt

# Choisir un autre modele Mistral
python scripts/run_pipeline.py benchmark/problems/knapsack.txt --model codestral-latest


# Mock LLM (offline, N-queens uniquement, pas de cle requise)
python scripts/run_pipeline.py benchmark/problems/nqueens.txt --mock
```

### Benchmark complet

```bash
python scripts/run_benchmark.py
```

Produit `benchmark_report.json` avec, pour chaque problème :
- Sortie de chaque étage du pipeline
- Statut de la vérification (syntaxique, faisable, sémantique)
- Comparaison à la référence manuelle (gap d'objectif, lignes de code)
- Étage où l'échec a eu lieu si applicable

### Tester que les références tournent

```bash
python -m pytest tests/
```

## Méthodologie d'évaluation

Trois niveaux de vérification (cf `cp_llm/verification.py`) :

1. **Syntaxique** : le code généré parse et s'exécute sans exception
2. **Faisabilité** : `solver.Solve()` retourne `OPTIMAL` ou `FEASIBLE` sur petites instances
3. **Sémantique** : la solution trouvée respecte chaque contrainte que l'étage 3 a extraite

La taxonomie d'erreurs (extraite via le benchmark) :

- C1 — Variable manquée
- C2 — Mauvais type de variable (Int au lieu d'Interval, etc)
- C3 — Bornes incorrectes
- C4 — Contrainte explicite manquée
- C5 — Contrainte implicite manquée (les "évidences" non dites)
- C6 — Mauvaise direction d'optimisation
- C7 — Erreur de génération de code (API ortools mal utilisée)

## Statut

- [x] Pipeline 4 étages avec schémas Pydantic
- [x] Mode mock LLM pour démonstration end-to-end (N-queens)
- [x] 3 problèmes de référence : N-queens, knapsack, graph coloring
- [x] Vérification syntaxique + faisabilité
- [ ] Vérification sémantique automatique (à compléter)
- [ ] Stratégies de correction (boucle de réparation après échec)
- [ ] 7 problèmes supplémentaires (nurse rostering, VRP, etc)
- [ ] Comparaison expert/pipeline (manuel)
