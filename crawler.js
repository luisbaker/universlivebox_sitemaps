const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * Crawler pour UniversLivebox.com
 * Récupère dynamiquement le contenu du site pour alimenter le générateur de sitemap
 * Ceci est un module optionnel qui peut être utilisé à la place des données statiques
 */

// Configuration
const CONFIG = {
  domaine: 'https://universlivebox.com',
  fichierSortie: './data/articles.json',
  maxPages: 50, // Augmenté pour récupérer plus d'articles
  delaiEntreRequetes: 300, // Réduit pour aller plus vite tout en respectant le serveur
  pagesCategories: [
    '', // Page d'accueil
    '/orange', 
    '/free', 
    '/bouygues', 
    '/sfr', 
    '/fibre', 
    '/xgs-pon', 
    '/4g-5g', 
    '/cybersecurite', 
    '/tutos', 
    '/detente', 
    '/bons-plans'
  ],
  // Nouvelle configuration pour chercher les pages de tags
  extraireTags: true,
  explorerTags: true,
  maxTagsAExplorer: 10
};

/**
 * Extrait les liens d'articles depuis plusieurs pages
 * @returns {Promise<Array>} Tableau d'URLs d'articles
 */
async function extraireURLsArticles() {
  try {
    console.log(`Début de l'extraction des URLs d'articles...`);
    const toutesUrls = new Set();
    const tagsDecouverts = new Set();
    
    // Parcours de chaque page de catégorie
    for (const page of CONFIG.pagesCategories) {
      const url = `${CONFIG.domaine}${page}`;
      console.log(`Extraction des URLs depuis ${url}...`);
      
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (UniversLivebox Sitemap Generator; contact@universlivebox.com)'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        // Extraction des liens d'articles
        // Sélecteurs adaptés pour UniversLivebox.com basés sur l'inspection visuelle
        $('article a, .post-title a, h2 a, .article-link').each((index, element) => {
          const lien = $(element).attr('href');
          if (lien && (lien.startsWith('/') || lien.startsWith(CONFIG.domaine)) && !lien.includes('#')) {
            const urlNormalisee = lien.startsWith('/') ? lien : lien.replace(CONFIG.domaine, '');
            toutesUrls.add(urlNormalisee);
          }
        });
        
        // Extraction des tags/étiquettes si configuré
        if (CONFIG.extraireTags) {
          $('.tags a, .tag a, .tag-link, a[rel="tag"], .category-link, a.cat-link').each((index, element) => {
            const lien = $(element).attr('href');
            if (lien && (lien.startsWith('/') || lien.startsWith(CONFIG.domaine))) {
              const urlTag = lien.startsWith('/') ? lien : lien.replace(CONFIG.domaine, '');
              // Vérifier que c'est bien un tag et pas un autre type de lien
              if (urlTag.includes('tag') || urlTag.includes('category') || urlTag.includes('cat/')) {
                tagsDecouverts.add(urlTag);
              }
            }
          });
        }
        
        // Attendre entre chaque requête
        await new Promise(resolve => setTimeout(resolve, CONFIG.delaiEntreRequetes));
      } catch (error) {
        console.error(`Erreur lors de l'extraction depuis ${url}: ${error.message}`);
        // Continue avec la prochaine page malgré l'erreur
      }
    }
    
    // Explorer les pages de tags si configuré
    if (CONFIG.explorerTags && tagsDecouverts.size > 0) {
      console.log(`${tagsDecouverts.size} tags découverts, exploration des pages de tags...`);
      let tagsArray = Array.from(tagsDecouverts);
      
      // Limiter le nombre de tags à explorer
      if (tagsArray.length > CONFIG.maxTagsAExplorer) {
        console.log(`Limitation à ${CONFIG.maxTagsAExplorer} tags sur ${tagsArray.length} découverts`);
        tagsArray = tagsArray.slice(0, CONFIG.maxTagsAExplorer);
      }
      
      for (const tagUrl of tagsArray) {
        const url = `${CONFIG.domaine}${tagUrl}`;
        console.log(`Extraction des articles du tag: ${url}`);
        
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (UniversLivebox Sitemap Generator; contact@universlivebox.com)'
            }
          });
          
          const $ = cheerio.load(response.data);
          
          $('article a, .post-title a, h2 a, .article-link').each((index, element) => {
            const lien = $(element).attr('href');
            if (lien && (lien.startsWith('/') || lien.startsWith(CONFIG.domaine)) && !lien.includes('#')) {
              const urlNormalisee = lien.startsWith('/') ? lien : lien.replace(CONFIG.domaine, '');
              toutesUrls.add(urlNormalisee);
            }
          });
          
          // Attendre entre chaque requête
          await new Promise(resolve => setTimeout(resolve, CONFIG.delaiEntreRequetes));
        } catch (error) {
          console.error(`Erreur lors de l'extraction depuis le tag ${url}: ${error.message}`);
          // Continue malgré l'erreur
        }
      }
    }
    
    // Conversion Set -> Array
    const urls = Array.from(toutesUrls);
    console.log(`Total: ${urls.length} URLs d'articles extraites.`);
    return urls;
  } catch (error) {
    console.error(`Erreur lors de l'extraction des URLs: ${error.message}`);
    return [];
  }
}

/**
 * Extrait les informations d'un article à partir de son URL
 * @param {String} url URL de l'article
 * @returns {Promise<Object|null>} Informations de l'article ou null en cas d'erreur
 */
async function extraireInfosArticle(url) {
  try {
    console.log(`Extraction des informations pour l'article: ${url}`);
    const urlComplete = url.startsWith('http') ? url : `${CONFIG.domaine}${url}`;
    
    const response = await axios.get(urlComplete, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (UniversLivebox Sitemap Generator; contact@universlivebox.com)'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extraction du titre (plusieurs sélecteurs possibles)
    const titre = $('h1').first().text().trim() || 
                 $('.post-title').first().text().trim() || 
                 $('article h2').first().text().trim();
    
    // Extraction de la date (plusieurs formats possibles)
    let dateText = '';
    let dateElement = $('time');
    
    if (dateElement.length > 0) {
      dateText = dateElement.attr('datetime') || dateElement.text().trim();
    } else {
      dateText = $('.date, .post-date, .published').first().text().trim();
    }
    
    // Extraction de la catégorie
    let categorie = '';
    const categorieElement = $('.category, a[rel="category"], .tag-link').first();
    
    if (categorieElement.length > 0) {
      categorie = categorieElement.text().trim().toLowerCase();
    } else {
      // Essayer d'extraire la catégorie de l'URL
      const urlParts = url.split('/').filter(part => part);
      if (urlParts.length > 0) {
        categorie = urlParts[0]; // Première partie de l'URL après le domaine
      }
    }
    
    // Extraction de l'auteur de l'article
    let auteur = '';
    // Essayer plusieurs sélecteurs communs pour les auteurs
    const auteurSelectors = [
      '.author-name', 
      '.author a', 
      '.author', 
      '.byline', 
      '.post-author', 
      'meta[name="author"]',
      '.entry-author',
      '[rel="author"]'
    ];
    
    for (const selector of auteurSelectors) {
      const auteurElement = $(selector).first();
      if (auteurElement.length > 0) {
        // Si c'est une balise meta, l'attribut est dans content
        if (selector === 'meta[name="author"]') {
          auteur = auteurElement.attr('content');
        } else {
          auteur = auteurElement.text().trim();
        }
        
        // Nettoyer l'auteur des préfixes communs
        auteur = auteur.replace(/^(by|par|de|écrit par|posté par|publié par)[\s:]+/i, '').trim();
        
        if (auteur) break; // Sortir dès qu'on a trouvé un auteur
      }
    }
    
    // Si toujours pas d'auteur, chercher dans d'autres parties du document
    if (!auteur) {
      // Chercher "Par [Nom]" dans le texte de la page
      const pageText = $('p').slice(0, 3).text(); // Regarder dans les 3 premiers paragraphes
      const authorMatch = pageText.match(/(?:Par|By|De)\s+([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+){0,2})/);
      if (authorMatch && authorMatch[1]) {
        auteur = authorMatch[1].trim();
      }
    }
    
    // Extraction des tags
    const tags = [];
    $('.tags a, .tag a, a[rel="tag"], .post-tags a, .entry-tags a, .article-tags a').each((index, element) => {
      const tagText = $(element).text().trim().toLowerCase();
      if (tagText && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });
    
    // Traitement de la date
    let date = new Date();
    
    // Format: JJ mois AAAA (ex: 17 mai 2025)
    const dateMatch1 = dateText.match(/(\d{1,2})\s+(\w+)\.?\s+(\d{4})/);
    if (dateMatch1) {
      const jour = dateMatch1[1];
      const mois = {
        'jan': 0, 'janv': 0, 'fév': 1, 'févr': 1, 'mar': 2, 'mars': 2, 
        'avr': 3, 'avril': 3, 'mai': 4, 'juin': 5, 'juil': 6, 'juillet': 6, 
        'aoû': 7, 'août': 7, 'sep': 8, 'sept': 8, 'oct': 9, 'nov': 10, 'déc': 11
      };
      const moisIndex = mois[dateMatch1[2].substring(0, 4).toLowerCase()] || 0;
      const annee = dateMatch1[3];
      
      date = new Date(annee, moisIndex, jour);
    } 
    // Format: AAAA-MM-JJ (ISO)
    else if (dateText.match(/\d{4}-\d{2}-\d{2}/)) {
      date = new Date(dateText);
    }
    
    // Format ISO pour la date
    const dateFormatee = date.toISOString().split('T')[0];
    
    return {
      titre: titre || "Article sans titre",
      url,
      date: dateFormatee,
      categorie: categorie.replace(/\s+/g, '-').replace(/[^\w-]/g, '') || "non-categorise",
      tags: tags,
      auteur: auteur || "UniversLivebox" // Valeur par défaut si aucun auteur trouvé
    };
  } catch (error) {
    console.error(`Erreur lors de l'extraction des informations pour ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Fonction principale pour le crawling
 */
async function crawler() {
  console.log('Démarrage du crawler pour UniversLivebox...');
  
  try {
    // Créer le dossier de données s'il n'existe pas
    const dataDir = path.dirname(CONFIG.fichierSortie);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Extraire les URLs des articles
    const urls = await extraireURLsArticles();
    
    // Limiter le nombre d'URLs à traiter
    const urlsLimitees = urls.slice(0, CONFIG.maxPages);
    
    // Extraire les informations des articles
    const articles = [];
    for (const url of urlsLimitees) {
      const article = await extraireInfosArticle(url);
      if (article) {
        articles.push(article);
      }
      
      // Attendre entre chaque requête
      await new Promise(resolve => setTimeout(resolve, CONFIG.delaiEntreRequetes));
    }
    
    // Enregistrer les résultats
    fs.writeFileSync(CONFIG.fichierSortie, JSON.stringify(articles, null, 2));
    console.log(`Données enregistrées dans ${CONFIG.fichierSortie}`);
    
    console.log('Crawling terminé avec succès!');
    return articles;
  } catch (error) {
    console.error(`Erreur lors du crawling: ${error.message}`);
    return [];
  }
}

// Exporter les fonctions pour utilisation dans le générateur de sitemap
module.exports = {
  crawler,
  extraireURLsArticles,
  extraireInfosArticle
};

// Exécuter directement si lancé comme script principal
if (require.main === module) {
  crawler();
} 