const https = require('https');

// 🎌 Função para pesquisar animes
async function searchAnime(query) {
  return new Promise((resolve) => {
    const url = `https://api.jikan.moe/v4/anime?query=${encodeURIComponent(query)}&limit=25`;
    
    console.log(`\n🔍 Pesquisando: "${query}"`);
    console.log(`📡 URL: ${url}\n`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.data && result.data.length > 0) {
            // Procura pelo anime que melhor corresponde ao nome buscado (case-insensitive)
            const queryLower = query.toLowerCase();
            let best = result.data[0];
            
            for (const anime of result.data) {
              const titleLower = (anime.title || '').toLowerCase();
              const titleEnLower = (anime.title_english || '').toLowerCase();
              
              // Se encontrar correspondência exata, usa esse
              if (titleLower.includes(queryLower) || titleEnLower.includes(queryLower)) {
                best = anime;
                break;
              }
            }
            
            resolve(best);
          } else {
            resolve({ error: 'Anime não encontrado' });
          }
        } catch (e) {
          resolve({ error: 'Erro ao processar resposta' });
        }
      });
    }).on('error', (error) => {
      resolve({ error: error.message });
    });
  });
}

// Testar diferentes animes
async function testAnimeSearch() {
  const animes = ['Demon Slayer', 'Naruto', 'Death Note', 'Attack on Titan'];
  
  for (const anime of animes) {
    const animeData = await searchAnime(anime);
    
    if (animeData.error) {
      console.log(`❌ Erro: ${animeData.error}\n`);
    } else {
      console.log(`✅ Encontrado!\n`);
      console.log(`📽️ Título: ${animeData.title}`);
      console.log(`🌐 Título EN: ${animeData.title_english}`);
      console.log(`📊 Tipo: ${animeData.type}`);
      console.log(`📺 Episódios: ${animeData.episodes}`);
      console.log(`⭐ Score: ${animeData.score}`);
      console.log(`📅 Status: ${animeData.status}`);
      console.log(`🕐 Aired: ${animeData.aired?.string}`);
      console.log(`🎬 Estúdio: ${animeData.studios?.[0]?.name}`);
      console.log(`📝 Sinopse: ${(animeData.synopsis || 'N/A').substring(0, 150)}...`);
      console.log(`🔗 Link: ${animeData.url}`);
      console.log('\n' + '='.repeat(70) + '\n');
    }
    
    // Aguardar 1 segundo entre requisições para não sobrecarregar
    await new Promise(r => setTimeout(r, 1000));
  }
}

testAnimeSearch();
