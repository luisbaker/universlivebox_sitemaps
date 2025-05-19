# Générateur de Sitemaps pour UniversLivebox

Ce script Node.js génère des sitemaps XML pour le site UniversLivebox, conformément aux spécifications de Google et Google News.

## Fonctionnalités

- Génération d'un sitemap standard (sitemap.xml)
- Génération d'un sitemap Google News (sitemap-news.xml) avec prise en charge des auteurs
- Génération d'un index de sitemap (sitemap-index.xml)
- Exploration automatique des tags et catégories
- Respect des normes XML et des spécifications Google

## Prérequis

- Node.js (version 12 ou supérieure)
- npm (gestionnaire de paquets Node.js)

## Installation

1. Clonez ce dépôt:
```bash
git clone https://github.com/luisbaker/universlivebox_sitemaps.git
cd universlivebox_sitemaps
```

2. Installez les dépendances requises:
```bash
npm install
```

## Utilisation

### Génération manuelle des sitemaps

Exécutez le script avec la commande:

```bash
npm run start:dynamic
```

Les fichiers seront générés dans le dossier `./sitemaps/`.

### Fichiers générés

- `sitemap.xml`: Sitemap standard avec toutes les pages du site
- `sitemap-news.xml`: Sitemap Google News avec les articles récents
- `sitemap-index.xml`: Index qui référence tous les sitemaps
- `sitemap-tag-xxxx.xml`: Sitemaps par tag (si suffisamment d'articles)
- `robots.txt`: Avec référence au sitemap-index

Si le nombre d'articles dépasse les limites de Google, les fichiers seront automatiquement divisés (ex: `sitemap1.xml`, `sitemap2.xml`, etc.).

## Automatisation

### Option 1: Tâche CRON sur le serveur

Pour exécuter le script automatiquement tous les jours à 4h du matin:

1. Connectez-vous à votre serveur via SSH
2. Ouvrez l'éditeur crontab:
```bash
crontab -e
```

3. Ajoutez la ligne suivante:
```
0 4 * * * cd /chemin/vers/universlivebox_sitemaps && /usr/bin/node sitemap-generator-dynamic.js
```

### Option 2: GitHub Actions

Pour automatiser avec GitHub Actions, créez un fichier `.github/workflows/generate-sitemaps.yml`:

```yaml
name: Generate Sitemaps

on:
  schedule:
    - cron: '0 4 * * *'  # Tous les jours à 4h du matin
  workflow_dispatch:      # Permet de lancer manuellement

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate sitemaps
        run: node sitemap-generator-dynamic.js
        
      - name: Commit and push changes
        run: |
          git config --global user.name 'GitHub Actions'
          git config --global user.email 'actions@github.com'
          git add sitemaps/
          git commit -m "Auto-update sitemaps" || echo "No changes to commit"
          git push
```

### Option 3: Script de déploiement automatique

Créez un script `deploy.sh` pour générer et déployer les sitemaps:

```bash
#!/bin/bash

# Génerer les sitemaps
node sitemap-generator-dynamic.js

# Déployer vers le serveur web
scp -r sitemaps/* utilisateur@serveur:/chemin/vers/www/
```

Rendez-le exécutable:
```bash
chmod +x deploy.sh
```

## Configuration

Vous pouvez modifier les paramètres dans les fichiers:

- `sitemap-generator-dynamic.js`: Configuration principale
- `crawler.js`: Configuration du crawler

Paramètres importants dans `sitemap-generator-dynamic.js`:
```javascript
const CONFIG = {
  nomSite: 'UniversLivebox',
  domaine: 'https://universlivebox.com',
  // ... autres paramètres
};
```

## Contribution

Les contributions sont les bienvenues! N'hésitez pas à ouvrir une issue ou une pull request.

## Structure des fichiers

- `sitemap-generator.js`: Génère des sitemaps à partir de données statiques
- `crawler.js`: Module pour crawler le site et extraire les articles
- `sitemap-generator-dynamic.js`: Génère des sitemaps à partir des données du crawler
- `package.json`: Configuration du projet et dépendances

## Intégration avec votre site

Pour une utilisation en production, il est recommandé:

1. D'adapter les sélecteurs CSS dans `crawler.js` à la structure de votre site
2. D'exécuter le script via une tâche planifiée (cron job)
3. De soumettre l'URL de votre index sitemap à Google Search Console

## Dépendances

- `fs`, `path`: Modules Node.js pour la gestion des fichiers
- `xml2js`: Module pour la génération de XML
- `axios`: Client HTTP pour les requêtes web
- `cheerio`: Parser HTML pour extraire les données des pages web

## Notes importantes

- Pour Google News, seuls les articles des 48 dernières heures sont inclus, conformément aux exigences de Google
- Respectez l'étiquette de crawling en configurant des délais raisonnables entre les requêtes 