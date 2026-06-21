// --- BROWSER / ELECTRON ENVIRONMENT DETECTOR & FALLBACK DB ---
let dbCall;
let selectFile;

if (typeof window.api !== 'undefined' && typeof window.api.dbCall === 'function') {
  // Running inside Electron
  dbCall = window.api.dbCall;
  selectFile = window.api.selectFile;
} else {
  // Running in a standard web browser (Fallback Database via localStorage)
  console.log('Running in browser mode. Activating localStorage fallback database.');

  class BrowserDB {
    constructor() {
      this.key = 'music_finder_local_db_data';
      this.data = {
        users: [],
        posts: [],
        comments: [],
        songs: []
      };
      this.init();
    }

    init() {
      const stored = localStorage.getItem(this.key);
      let loadedCorrectly = false;
      if (stored) {
        try {
          this.data = JSON.parse(stored);
          if (this.data.songs && this.data.songs.length >= 8) {
            loadedCorrectly = true;
          }
        } catch (e) {
          loadedCorrectly = false;
        }
      }
      
      if (!loadedCorrectly) {
        this.seedSongs();
        this.save();
      }
    }

    save() {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    }

    // Mock SHA256 / Base64 password hashing for browser
    hashPassword(password, salt) {
      if (!salt) {
        salt = Math.random().toString(36).substring(2, 10);
      }
      // Simple custom hashing for standalone browser compatibility
      let hash = password;
      for (let i = 0; i < 3; i++) {
        hash = btoa(hash + salt);
      }
      return { hash, salt };
    }

    seedSongs() {
      this.data.songs = [
        {
          id: 1,
          title: "애국가",
          artist: "안익태",
          lyrics: "동해 물과 백두산이 마르고 닳도록 하느님이 보우하사 우리나라 만세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세."
        },
        {
          id: 2,
          title: "곰 세 마리",
          artist: "전래동요",
          lyrics: "곰 세 마리가 한 집에 있어 아빠 곰 엄마 곰 아기 곰 아빠 곰은 뚱뚱해 엄마 곰은 날씬해 아기 곰은 너무 귀여워 으쓱 으쓱 잘한다"
        },
        {
          id: 3,
          title: "반짝반짝 작은 별",
          artist: "모차르트/전래동요",
          lyrics: "반짝반짝 작은 별 아름답게 비치네 동쪽 하늘에서도 서쪽 하늘에서도 반짝반짝 작은 별 아름답게 비치네"
        },
        {
          id: 4,
          title: "Dynamite",
          artist: "BTS (방탄소년단)",
          lyrics: "'Cause I, I, I'm in the stars tonight. So watch me bring the fire and set the night alight. Shining through the city with a little funk and soul. So light it up like dynamite, woah."
        },
        {
          id: 5,
          title: "봄날 (Spring Day)",
          artist: "BTS (방탄소년단)",
          lyrics: "보고 싶다 이렇게 말하니까 더 보고 싶다 너희 사진을 보고 있어도 보고 싶다 흔들리는 이 바람결에 날려간 낙엽처럼"
        },
        {
          id: 6,
          title: "Hype Boy",
          artist: "NewJeans (뉴진스)",
          lyrics: "Baby got me looking so crazy 빠져버릴 것 같아 baby. 암실 속의 spotlight처럼 비추네. 나를 위해 노래를 불러줘."
        },
        {
          id: 7,
          title: "Love Dive",
          artist: "IVE (아이브)",
          lyrics: "네가 가진 그 눈빛에 빠져 들어라 참을 수 없는 이끌림과 호기심. 묘한 이 느낌은 뭘까. 숨참고 love dive."
        },
        {
          id: 8,
          title: "Let It Go",
          artist: "Idina Menzel (겨울왕국 OST)",
          lyrics: "The snow glows white on the mountain tonight, not a footprint to be seen. A kingdom of isolation, and it looks like I'm the queen."
        }
      ];
    }

    registerUser(id, password, email) {
      if (!id || !password || !email) {
        return { success: false, message: "모든 항목을 입력해주세요." };
      }
      const cleanId = id.trim();
      if (this.data.users.some(u => u.id.toLowerCase() === cleanId.toLowerCase())) {
        return { success: false, message: "이미 존재하는 아이디입니다." };
      }
      const { hash, salt } = this.hashPassword(password);
      const newUser = {
        id: cleanId,
        hash,
        salt,
        email: email.trim(),
        createdAt: new Date().toISOString()
      };
      this.data.users.push(newUser);
      this.save();
      return { success: true, message: "회원가입에 성공했습니다!" };
    }

    loginUser(id, password) {
      if (!id || !password) {
        return { success: false, message: "아이디와 비밀번호를 입력해주세요." };
      }
      const user = this.data.users.find(u => u.id.toLowerCase() === id.trim().toLowerCase());
      if (!user) {
        return { success: false, message: "존재하지 않는 아이디입니다." };
      }
      const { hash } = this.hashPassword(password, user.salt);
      if (hash !== user.hash) {
        return { success: false, message: "비밀번호가 일치하지 않습니다." };
      }
      return {
        success: true,
        user: { id: user.id, email: user.email, createdAt: user.createdAt }
      };
    }

    changePassword(id, oldPassword, newPassword) {
      const user = this.data.users.find(u => u.id === id);
      if (!user) return { success: false, message: "사용자를 찾을 수 없습니다." };
      const { hash } = this.hashPassword(oldPassword, user.salt);
      if (hash !== user.hash) {
        return { success: false, message: "현재 비밀번호가 일치하지 않습니다." };
      }
      const { hash: newHash, salt: newSalt } = this.hashPassword(newPassword);
      user.hash = newHash;
      user.salt = newSalt;
      this.save();
      return { success: true, message: "비밀번호가 변경되었습니다." };
    }

    checkDuplicateId(id) {
      const exists = this.data.users.some(u => u.id.toLowerCase() === id.trim().toLowerCase());
      return { success: true, exists };
    }

    getSongs() { return this.data.songs; }
    async searchOnlineLyrics(query) {
      if (!query) return [];
      const songs = [];
      const proxyUrl = (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      
      // 1. Try Naver
      try {
       const naverUrl = proxyUrl(...)
      const response = await fetch(naverUrl);
      const naverHtml = await response.text();
        
        const titleMatch = naverHtml.match(/class="area_text_title"[\s\S]*?<strong class="_text">([\s\S]*?)<\/strong>/i);
        const lyricsMatch = naverHtml.match(/class="[^"]*?_content_text[^"]*?"[\s\S]*?>([\s\S]*?)<\/p>/i);
        
        if (titleMatch && lyricsMatch) {
          const title = titleMatch[1].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
          const subTitleMatch = naverHtml.match(/<div class="sub_title"[\s\S]*?>([\s\S]*?)<\/div>/i);
          let artist = 'Unknown';
          if (subTitleMatch) {
            const artistMatch = subTitleMatch[1].match(/<a[^>]*?>([\s\S]*?)<\/a>/i);
            if (artistMatch) {
              artist = artistMatch[1].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
            }
          }
          const lyrics = lyricsMatch[1]
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .trim();
            
          songs.push({
            id: `naver_online`,
            title,
            artist,
            lyrics,
            source: 'Naver'
          });
        }
      } catch (e) {
        console.error('Browser Naver search failed:', e);
      }
      
      // 2. Try Melon
      try {
        const melonUrl = proxyUrl(`https://www.melon.com/search/lyric/index.htm?q=${encodeURIComponent(query)}`);
        const response = await fetch(melonUrl);
        const melonHtml = await response.text();
        
        const songRegex = /goSongDetail\('(\d+)'\)/g;
        const songIds = [];
        let match;
        while ((match = songRegex.exec(melonHtml)) !== null && songIds.length < 5) {
          if (!songIds.includes(match[1])) {
            songIds.push(match[1]);
          }
        }
        
        for (const songId of songIds) {
          try {
            const detailUrl = proxyUrl(`https://www.melon.com/song/detail.htm?songId=${songId}`);
            const detailRes = await fetch(detailUrl);
            const detailHtml = await detailRes.text();
            
            const titleMatch = detailHtml.match(/<div class="song_name"[\s\S]*?>([\s\S]*?)<\/div>/);
            if (!titleMatch) continue;
            const title = titleMatch[1]
              .replace(/<[^>]*>/g, '')
              .replace(/^곡명\s*/, '')
              .trim()
              .replace(/\s+/g, ' ');
              
            const artistMatch = detailHtml.match(/<div class="artist"[\s\S]*?>([\s\S]*?)<\/div>/);
            const artist = artistMatch ? artistMatch[1]
              .replace(/<[^>]*>/g, '')
              .replace(/^아티스트\s*/, '')
              .replace(/^가수\s*/, '')
              .trim()
              .replace(/\s+/g, ' ') : 'Unknown';
              
            if (songs.some(s => s.title.toLowerCase() === title.toLowerCase() && s.artist.toLowerCase() === artist.toLowerCase())) {
              continue;
            }
            
            const lyricsMatch = detailHtml.match(/<div class="lyric" id="d_video_summary"[\s\S]*?>([\s\S]*?)<\/div>/);
            if (lyricsMatch) {
              const lyrics = lyricsMatch[1]
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>/g, '')
                .trim();
                
              songs.push({
                id: `melon_${songId}`,
                title,
                artist,
                lyrics,
                source: 'Melon'
              });
            }
          } catch (e) {
            console.error(`Browser Melon detail fetch failed for ${songId}:`, e);
          }
        }
      } catch (e) {
        console.error('Browser Melon search failed:', e);
      }
      
      return songs;
    }
    getPosts() {
      return [...this.data.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getPostById(postId) {
      const post = this.data.posts.find(p => p.id === parseInt(postId));
      if (!post) return null;
      const comments = this.data.comments.filter(c => c.postId === parseInt(postId));
      return { ...post, comments };
    }

    createPost(title, content, authorId, authorName, attachment = null) {
      const newPost = {
        id: Date.now(),
        title: title.trim(),
        content: content,
        authorId: authorId,
        authorName: authorName,
        attachment: attachment,
        createdAt: new Date().toISOString(),
        commentsCount: 0
      };
      this.data.posts.push(newPost);
      this.save();
      return { success: true, post: newPost };
    }

    updatePost(postId, title, content, authorId) {
      const post = this.data.posts.find(p => p.id === parseInt(postId));
      if (!post) return { success: false, message: "게시글을 찾을 수 없습니다." };
      if (post.authorId !== authorId) return { success: false, message: "수정 권한이 없습니다." };
      post.title = title.trim();
      post.content = content;
      post.updatedAt = new Date().toISOString();
      this.save();
      return { success: true, post };
    }

    deletePost(postId, authorId) {
      const idx = this.data.posts.findIndex(p => p.id === parseInt(postId));
      if (idx === -1) return { success: false, message: "게시글을 찾을 수 없습니다." };
      if (this.data.posts[idx].authorId !== authorId) return { success: false, message: "삭제 권한이 없습니다." };
      this.data.posts.splice(idx, 1);
      this.data.comments = this.data.comments.filter(c => c.postId !== parseInt(postId));
      this.save();
      return { success: true };
    }

    createComment(postId, content, authorId, authorName) {
      const post = this.data.posts.find(p => p.id === parseInt(postId));
      if (!post) return { success: false, message: "게시글이 존재하지 않습니다." };
      const newComment = {
        id: Date.now(),
        postId: parseInt(postId),
        content: content.trim(),
        authorId: authorId,
        authorName: authorName,
        createdAt: new Date().toISOString()
      };
      this.data.comments.push(newComment);
      post.commentsCount = (post.commentsCount || 0) + 1;
      this.save();
      return { success: true, comment: newComment };
    }

    updateComment(commentId, content, authorId) {
      const comment = this.data.comments.find(c => c.id === parseInt(commentId));
      if (!comment) return { success: false, message: "댓글을 찾을 수 없습니다." };
      if (comment.authorId !== authorId) return { success: false, message: "수정 권한이 없습니다." };
      comment.content = content.trim();
      comment.updatedAt = new Date().toISOString();
      this.save();
      return { success: true, comment };
    }

    deleteComment(commentId, authorId) {
      const idx = this.data.comments.findIndex(c => c.id === parseInt(commentId));
      if (idx === -1) return { success: false, message: "댓글을 찾을 수 없습니다." };
      const comment = this.data.comments[idx];
      if (comment.authorId !== authorId) return { success: false, message: "삭제 권한이 없습니다." };
      const post = this.data.posts.find(p => p.id === comment.postId);
      if (post) {
        post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
      }
      this.data.comments.splice(idx, 1);
      this.save();
      return { success: true };
    }

    getUserPosts(authorId) {
      return this.data.posts.filter(p => p.authorId === authorId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getUserComments(authorId) {
      return this.data.comments
        .filter(c => c.authorId === authorId)
        .map(c => {
          const post = this.data.posts.find(p => p.id === c.postId);
          return { ...c, postTitle: post ? post.title : "삭제된 게시글" };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  const browserDbInstance = new BrowserDB();
  dbCall = (method, ...args) => {
    if (typeof browserDbInstance[method] === 'function') {
      try {
        const result = browserDbInstance[method](...args);
        return Promise.resolve(result);
      } catch (err) {
        return Promise.resolve({ success: false, message: err.message });
      }
    }
    return Promise.resolve({ success: false, message: `Method "${method}" not found.` });
  };

  selectFile = () => {
    return new Promise((resolve) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve({
          name: file.name,
          path: URL.createObjectURL(file), // Mock local object path
          size: file.size
        });
      };
      fileInput.click();
    });
  };
}

// --- GLOBAL APPLICATION STATE ---
let currentUser = null;
let activeView = 'lyrics-view';
let selectedAttachment = null;

// Audio Recording & Pitch Extraction State
let audioContext = null;
let analyserNode = null;
let mediaStream = null;
let recording = false;
let recordStartTime = 0;
let recordTimerInterval = null;
let pitchSequence = []; // Array of detected MIDI notes
let animationFrameId = null;

// MIDI Note numbers to note names helper
const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function midiToNoteName(midiNumber) {
  const noteIndex = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  return `${MIDI_NOTE_NAMES[noteIndex]}${octave}`;
}

// Check logged in user on startup
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupAuth();
  setupLyricsSearch();
  setupHummingSearch();
  setupCommunity();
  setupMyPage();
  
  // Load initial view
  switchView('lyrics-view');
  
  // Auto-fill logged in user if session exists
  const savedUser = localStorage.getItem('music_finder_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      updateUserSessionUI();
    } catch (e) {
      localStorage.removeItem('music_finder_user');
    }
  }
});

// --- NAVIGATION MANAGER ---
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      
      if (target === 'mypage-view' || (target === 'auth-view' && currentUser)) {
        if (currentUser) {
          switchView('mypage-view');
        } else {
          switchView('auth-view');
        }
      } else {
        switchView(target);
      }
    });
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
  });
}

function switchView(viewId) {
  activeView = viewId;
  
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  const targetPanel = document.getElementById(viewId);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    const target = btn.getAttribute('data-target');
    if (target === viewId) {
      btn.classList.add('active');
    } else if (viewId === 'mypage-view' && target === 'auth-view') {
      btn.classList.add('active');
    }
  });

  if (viewId === 'community-view') {
    loadPostsList();
  } else if (viewId === 'mypage-view') {
    loadMyPageData();
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('music_finder_user');
  updateUserSessionUI();
  alert('로그아웃 되었습니다.');
  switchView('lyrics-view');
}

function updateUserSessionUI() {
  const sidebarUserCard = document.getElementById('sidebar-user-card');
  const navAuthBtn = document.getElementById('nav-auth-btn');
  
  if (currentUser) {
    document.getElementById('user-display-name').textContent = currentUser.id;
    document.getElementById('user-display-email').textContent = currentUser.email;
    sidebarUserCard.style.display = 'flex';
    
    navAuthBtn.innerHTML = '<span class="nav-icon">👤</span> 마이페이지';
    navAuthBtn.setAttribute('data-target', 'mypage-view');
    
    const writeBox = document.getElementById('comment-write-box');
    const loginMsg = document.getElementById('comment-login-msg');
    if (writeBox) writeBox.style.display = 'flex';
    if (loginMsg) loginMsg.style.display = 'none';
  } else {
    sidebarUserCard.style.display = 'none';
    
    navAuthBtn.innerHTML = '<span class="nav-icon">👤</span> 로그인 / 회원가입';
    navAuthBtn.setAttribute('data-target', 'auth-view');
    
    const writeBox = document.getElementById('comment-write-box');
    const loginMsg = document.getElementById('comment-login-msg');
    if (writeBox) writeBox.style.display = 'none';
    if (loginMsg) loginMsg.style.display = 'block';
  }
}


// --- 1. 가사 검색 로직 ---
function setupLyricsSearch() {
  const searchBtn = document.getElementById('lyrics-search-btn');
  const searchInput = document.getElementById('lyrics-search-input');
  
  const performSearch = async () => {
    const query = searchInput.value.trim();
    if (!query) {
      alert('검색할 가사를 입력해주세요.');
      return;
    }
    
    const container = document.getElementById('lyrics-results-list');
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted)">가사 검색 진행 중... (실시간 Melon 가사 연동 작동 중)</div>';
    
    try {
      let songs = await dbCall('getSongs');
      
      // Browser-safe search
      try {
        const onlineSongs = await dbCall('searchOnlineLyrics', query);
        if (onlineSongs && onlineSongs.length > 0) {
          songs = [...songs, ...onlineSongs];
        }
      } catch (e) {
        console.warn('Online lyric search unavailable in browser mode.', e);
      }
      
      const results = [];
      songs.forEach(song => {
        const similarityScore = calculateLyricsSimilarity(query, song.lyrics);
        if (similarityScore >= 0.70) {
          results.push({
            song,
            score: Math.round(similarityScore * 100),
            matchedPart: findBestMatchingSegment(query, song.lyrics)
          });
        }
      });
      
      results.sort((a, b) => b.score - a.score);
      renderLyricsResults(results);
    } catch (e) {
      console.error('Lyrics search failed:', e);
      container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--accent-rose)">검색 과정에서 에러가 발생했습니다.</div>';
    }
  };

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });
}

function calculateLyricsSimilarity(query, lyrics) {
  const qClean = query.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const lClean = lyrics.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  
  if (lClean.includes(qClean)) {
    return 1.0;
  }
  
  const qWords = qClean.split(' ');
  const lWords = lClean.split(' ');
  
  if (lWords.length <= qWords.length) {
    return diceCoefficient(qClean, lClean);
  }
  
  let maxSimilarity = 0;
  const windowSize = qWords.length + 2;
  
  for (let i = 0; i <= lWords.length - qWords.length; i++) {
    const segment = lWords.slice(i, i + windowSize).join(' ');
    const sim = diceCoefficient(qClean, segment);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
    }
  }
  
  return maxSimilarity;
}

function diceCoefficient(str1, str2) {
  const s1 = str1.replace(/\s+/g, '');
  const s2 = str2.replace(/\s+/g, '');
  
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;
  
  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };
  
  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);
  
  let intersection = 0;
  for (const val of bigrams1) {
    if (bigrams2.has(val)) intersection++;
  }
  
  return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
}

function findBestMatchingSegment(query, lyrics) {
  const qClean = query.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
  const sentences = lyrics.split(/[.?!]|\n/);
  
  let bestSentence = sentences[0] || lyrics;
  let maxMatchScore = 0;
  
  sentences.forEach(sentence => {
    const sClean = sentence.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
    let matches = 0;
    for (let i = 0; i < qClean.length; i++) {
      if (sClean.includes(qClean[i])) matches++;
    }
    const score = matches / Math.max(1, qClean.length);
    if (score > maxMatchScore) {
      maxMatchScore = score;
      bestSentence = sentence.trim();
    }
  });
  
  let highlighted = bestSentence;
  const queryWords = query.split(/\s+/).filter(w => w.length > 0);
  
  queryWords.forEach(word => {
    const cleanWord = word.replace(/[^a-zA-Z0-9가-힣]/g, '');
    if (cleanWord.length > 0) {
      try {
        const regex = new RegExp(`(${cleanWord})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
      } catch (e) {}
    }
  });
  
  return highlighted;
}

function renderLyricsResults(results) {
  const container = document.getElementById('lyrics-results-list');
  const countSpan = document.getElementById('lyrics-result-count');
  
  countSpan.textContent = results.length;
  container.innerHTML = '';
  
  if (results.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <span class="no-data-icon">🧐</span>
        <p>일치율 70% 이상의 노래를 찾지 못했습니다. 다른 가사로 검색해보세요.</p>
      </div>
    `;
    return;
  }
  
  results.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-card';
    const isOnline = String(res.song.id).startsWith('online_') || String(res.song.id).startsWith('melon_') || String(res.song.id).startsWith('naver_');
    const sourceName = res.song.source || 'Melon';
    const onlineBadge = isOnline ? `<span class="badge" style="background-color: rgba(20, 184, 166, 0.15); color: var(--accent-teal); margin-left: 8px;">실시간 ${sourceName}</span>` : '';
    
    card.innerHTML = `
      <div class="result-main">
        <div class="song-header">
          <span class="song-title">${res.song.title}</span>
          <span class="song-artist">${res.song.artist}</span>
          ${onlineBadge}
        </div>
        <div class="matched-lyrics">"... ${res.matchedPart} ..."</div>
      </div>
      <div class="badge-similarity ${res.score < 85 ? 'low' : ''}">유사도 ${res.score}%</div>
    `;
    container.appendChild(card);
  });
}


// --- 2. 허밍(멜로디) 검색 로직 ---
function setupHummingSearch() {
  const recordBtn = document.getElementById('record-btn');
  const statusText = document.getElementById('recording-status');
  const recordTime = document.getElementById('record-time');
  const canvas = document.getElementById('waveform-canvas');

  if (!canvas) {
    console.warn('humming canvas not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  
  ctx.fillStyle = '#0b0c13';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  window.addEventListener('resize', () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  });

  const tags = document.querySelectorAll('.guide-tag');
  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      simulateHummingSearch(tag.textContent);
    });
  });

  recordBtn.addEventListener('click', () => {
    if (!recording) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  async function startRecording() {
    pitchSequence = [];
    recording = true;
    recordBtn.classList.add('recording');
    recordBtn.innerHTML = '<span class="record-icon">■</span> <span class="record-text">녹음 중단 및 검색</span>';
    statusText.textContent = '흥얼거리시는 음정을 분석하고 있습니다...';
    
    recordStartTime = Date.now();
    recordTime.textContent = '00:00';
    
    recordTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordStartTime) / 1000);
      const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const seconds = String(elapsed % 60).padStart(2, '0');
      recordTime.textContent = `${minutes}:${seconds}`;
      
      if (elapsed >= 12) {
        stopRecording();
      }
    }, 1000);

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyserNode);
      
      visualizeAndDetect();
    } catch (e) {
      console.error('Microphone access failed:', e);
      statusText.textContent = '마이크 에러: 권한을 허용해주세요.';
      stopRecording();
      alert('마이크 접근에 실패했습니다. 권한 설정을 확인해주세요.');
    }
  }

  function stopRecording() {
    if (!recording) return;
    recording = false;
    
    clearInterval(recordTimerInterval);
    
    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = '<span class="record-icon">●</span> <span class="record-text">녹음 시작</span>';
    statusText.textContent = '분석 완료! 매칭 중...';
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContext) {
      audioContext.close();
    }
    
    processHummingResults();
  }

  function visualizeAndDetect() {
    const bufferLength = analyserNode.fftSize;
    const dataArray = new Float32Array(bufferLength);
    
    const draw = () => {
      if (!recording) return;
      animationFrameId = requestAnimationFrame(draw);
      
      analyserNode.getFloat32TimeDomainData(dataArray);
      
      ctx.fillStyle = '#0b0c13';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#14b8a6';
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] * 1.5;
        const y = (v * canvas.height / 2) + (canvas.height / 2);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      const sampleRate = audioContext.sampleRate;
      const frequency = autoCorrelatePitch(dataArray, sampleRate);
      
      if (frequency !== -1) {
        const midiNoteRaw = 12 * Math.log2(frequency / 440) + 69;
        const midiNote = Math.round(midiNoteRaw);
        
        if (midiNote >= 36 && midiNote <= 84) {
          const noteName = midiToNoteName(midiNote);
          statusText.textContent = `음정 감지 중: ${noteName} (${Math.round(frequency)} Hz)`;
          pitchSequence.push(midiNote);
        }
      }
    };
    
    draw();
  }
}

function autoCorrelatePitch(buffer, sampleRate) {
  const SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.015) {
    return -1;
  }

  let r1 = 0;
  let r2 = SIZE - 1;
  const threshold = 0.2;
  
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = SIZE / 2; i > 0; i--) {
    if (Math.abs(buffer[i]) < threshold) {
      r2 = i;
      break;
    }
  }

  const buf = buffer.slice(r1, r2);
  const len = buf.length;
  const correlations = new Float32Array(len);
  
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - i; j++) {
      correlations[i] += buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (correlations[d] > correlations[d + 1]) {
    d++;
  }
  
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < len; i++) {
    if (correlations[i] > maxval) {
      maxval = correlations[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  
  if (T0 > 0 && T0 < len - 1) {
    const x1 = correlations[T0 - 1];
    const x2 = correlations[T0];
    const x3 = correlations[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
  }

  const f0 = sampleRate / T0;
  if (f0 > 80 && f0 < 1000) {
    return f0;
  }
  
  return -1;
}

function getMelodyIntervals(notes) {
  if (notes.length === 0) return [];
  
  const compressed = [notes[0]];
  for (let i = 1; i < notes.length; i++) {
    const lastNote = compressed[compressed.length - 1];
    if (notes[i] !== lastNote) {
      compressed.push(notes[i]);
    }
  }
  
  const intervals = [];
  for (let i = 1; i < compressed.length; i++) {
    intervals.push(compressed[i] - compressed[i - 1]);
  }
  
  return { notes: compressed, intervals };
}

function calculateMelodySimilarity(userInt, dbInt) {
  if (userInt.length === 0 || dbInt.length === 0) return 0;
  
  const levenshtein = (a, b) => {
    const m = a.length;
    const n = b.length;
    let prevRow = Array(n + 1).fill(0).map((_, i) => i);
    let currRow = Array(n + 1).fill(0);
    
    for (let i = 1; i <= m; i++) {
      currRow[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        currRow[j] = Math.min(
          currRow[j - 1] + 1,
          prevRow[j] + 1,
          prevRow[j - 1] + cost
        );
      }
      prevRow = [...currRow];
    }
    return currRow[n];
  };

  const dist = levenshtein(userInt, dbInt);
  const maxLength = Math.max(userInt.length, dbInt.length);
  return 1 - (dist / maxLength);
}

async function simulateHummingSearch(songTitle) {
  const statusText = document.getElementById('recording-status');
  statusText.textContent = `시뮬레이션: "${songTitle}" 음정 분석 모델 로딩 중...`;
  
  const canvas = document.getElementById('waveform-canvas');
  const ctx = canvas.getContext('2d');
  let frame = 0;
  
  const drawSim = () => {
    if (frame > 60) {
      statusText.textContent = `시뮬레이션 분석 완료!`;
      runSimilarityMatch(songTitle);
      return;
    }
    
    requestAnimationFrame(drawSim);
    ctx.fillStyle = '#0b0c13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#14b8a6';
    ctx.beginPath();
    
    for (let i = 0; i < canvas.width; i += 10) {
      const y = (Math.sin((i + frame * 10) * 0.05) * 30 * Math.sin(frame * 0.1)) + canvas.height / 2;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();
    frame++;
  };
  
  drawSim();
}

async function runSimilarityMatch(songTitle) {
  try {
    const songs = await dbCall('getSongs');
    const matchedSong = songs.find(s => s.title === songTitle);
    
    if (!matchedSong) return;
    
    const simulatedIntervals = [...matchedSong.melodyIntervals];
    if (simulatedIntervals.length > 3) {
      simulatedIntervals[simulatedIntervals.length - 1] += 1;
    }
    
    const results = [];
    songs.forEach(song => {
      const sim = calculateMelodySimilarity(simulatedIntervals, song.melodyIntervals);
      const scoreBoost = song.id === matchedSong.id ? Math.max(sim, 0.94) : sim;
      
      if (scoreBoost >= 0.50) {
        results.push({
          song,
          score: Math.round(scoreBoost * 100),
          intervals: song.melodyIntervals
        });
      }
    });
    
    results.sort((a, b) => b.score - a.score);
    renderHummingResults(results);
  } catch (e) {
    console.error('Simulated match failed:', e);
  }
}

async function processHummingResults() {
  const container = document.getElementById('humming-results-list');
  
  if (pitchSequence.length < 5) {
    container.innerHTML = `
      <div class="no-data">
        <span class="no-data-icon">🤫</span>
        <p>녹음된 음정이 너무 짧거나 조용합니다. 소리를 좀 더 크고 뚜렷하게 허밍해주세요.<br>
        (또는 테스트용 가이드 태그를 눌러 시뮬레이션을 시도해보세요!)</p>
      </div>
    `;
    document.getElementById('humming-result-count').textContent = 0;
    return;
  }
  
  const analysis = getMelodyIntervals(pitchSequence);
  
  try {
    const songs = await dbCall('getSongs');
    const results = [];
    
    songs.forEach(song => {
      const sim = calculateMelodySimilarity(analysis.intervals, song.melodyIntervals);
      if (sim >= 0.50) {
        results.push({
          song,
          score: Math.round(sim * 100),
          intervals: song.melodyIntervals
        });
      }
    });
    
    results.sort((a, b) => b.score - a.score);
    renderHummingResults(results, analysis.notes);
  } catch (e) {
    console.error('Humming matching failed:', e);
  }
}

function renderHummingResults(results, userMidiNotes = null) {
  const container = document.getElementById('humming-results-list');
  const countSpan = document.getElementById('humming-result-count');
  
  countSpan.textContent = results.length;
  container.innerHTML = '';
  
  if (results.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <span class="no-data-icon">🤷</span>
        <p>매칭되는 노래를 찾지 못했습니다. 음이 정확한지 확인하고 다시 허밍해보세요.</p>
      </div>
    `;
    return;
  }

  let notesHtml = '';
  if (userMidiNotes && userMidiNotes.length > 0) {
    const noteNames = userMidiNotes.slice(0, 8).map(n => midiToNoteName(n)).join(' → ');
    notesHtml = `
      <div class="card" style="margin-bottom: 16px; padding: 14px; background: rgba(20, 184, 166, 0.05); border-color: rgba(20, 184, 166, 0.15)">
        <span style="font-size: 13px; color: var(--text-muted)">🎤 감지된 멜로디 노트 (처음 8음):</span>
        <strong style="margin-left: 8px; color: var(--accent-teal); font-family: monospace; font-size:14px;">${noteNames}</strong>
      </div>
    `;
  }
  
  container.innerHTML = notesHtml;
  
  results.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-main">
        <div class="song-header">
          <span class="song-title">${res.song.title}</span>
          <span class="song-artist">${res.song.artist}</span>
        </div>
        <div class="matched-melody">
          <span class="note-tag">대표 멜로디 간격</span>
          <span>${res.song.melodyIntervals.map(i => (i >= 0 ? `+${i}` : i)).join(', ')}</span>
        </div>
        <div class="matched-lyrics" style="margin-top: 8px;">
          대표 가사: "${res.song.lyrics.slice(0, 45)}..."
        </div>
      </div>
      <div class="badge-similarity ${res.score < 70 ? 'low' : ''}">일치도 ${res.score}%</div>
    `;
    container.appendChild(card);
  });
}


// --- 3. 커뮤니티 게시판 로직 ---
let currentPostId = null;

function setupCommunity() {
  const btnGoWrite = document.getElementById('btn-go-write');
  const btnWriteBack = document.getElementById('btn-write-back');
  const btnWriteCancel = document.getElementById('btn-write-cancel');
  const btnSubmitPost = document.getElementById('btn-submit-post');
  const btnDetailBack = document.getElementById('btn-detail-back');
  
  const btnSelectFile = document.getElementById('btn-select-file');
  const btnRemoveFile = document.getElementById('btn-remove-file');
  const attachedFileName = document.getElementById('attached-file-name');
  
  btnGoWrite.addEventListener('click', () => {
    if (!currentUser) {
      alert('로그인이 필요한 기능입니다.');
      switchView('auth-view');
      return;
    }
    openPostEditor();
  });
  
  btnWriteBack.addEventListener('click', () => {
    showSubView('post-list-subview');
  });
  
  btnWriteCancel.addEventListener('click', () => {
    showSubView('post-list-subview');
  });
  
  btnDetailBack.addEventListener('click', () => {
    showSubView('post-list-subview');
    loadPostsList();
  });

  btnSelectFile.addEventListener('click', async () => {
    const file = await selectFile();
    if (file) {
      selectedAttachment = file;
      attachedFileName.textContent = `${file.name} (${formatBytes(file.size)})`;
      btnRemoveFile.style.display = 'inline-block';
    }
  });

  btnRemoveFile.addEventListener('click', () => {
    selectedAttachment = null;
    attachedFileName.textContent = '선택된 파일 없음';
    btnRemoveFile.style.display = 'none';
  });

  btnSubmitPost.addEventListener('click', async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      switchView('auth-view');
      return;
    }

    const title = document.getElementById('post-title-input').value.trim();
    const content = document.getElementById('post-content-input').value;
    const postId = document.getElementById('write-post-id').value;
    
    if (!title || !content) {
      alert('제목과 내용을 모두 작성해주세요.');
      return;
    }

    try {
      let res;
      if (postId) {
        res = await dbCall('updatePost', postId, title, content, currentUser.id);
      } else {
        res = await dbCall('createPost', title, content, currentUser.id, currentUser.id, selectedAttachment);
      }
      
      if (res.success) {
        alert(postId ? '게시글이 수정되었습니다.' : '게시글이 성공적으로 작성되었습니다.');
        showSubView('post-list-subview');
        loadPostsList();
      } else {
        alert(res.message || '글 등록에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  });

  document.getElementById('btn-submit-comment').addEventListener('click', async () => {
    const commentInput = document.getElementById('comment-input');
    const content = commentInput.value.trim();
    if (!content) return;
    
    try {
      const res = await dbCall('createComment', currentPostId, content, currentUser.id, currentUser.id);
      if (res.success) {
        commentInput.value = '';
        loadPostDetails(currentPostId);
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error(e);
    }
  });

  document.getElementById('post-search-input').addEventListener('input', (e) => {
    loadPostsList(e.target.value.trim());
  });
}

function showSubView(subviewId) {
  document.getElementById('post-list-subview').style.display = subviewId === 'post-list-subview' ? 'block' : 'none';
  document.getElementById('post-write-subview').style.display = subviewId === 'post-write-subview' ? 'block' : 'none';
  document.getElementById('post-detail-subview').style.display = subviewId === 'post-detail-subview' ? 'block' : 'none';
}

async function loadPostsList(searchQuery = '') {
  const container = document.getElementById('posts-list-container');
  container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted)">로딩 중...</div>';
  
  try {
    const posts = await dbCall('getPosts');
    container.innerHTML = '';
    
    const filteredPosts = posts.filter(post => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return post.title.toLowerCase().includes(q) || post.content.toLowerCase().includes(q);
    });

    if (filteredPosts.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          <span class="no-data-icon">✍️</span>
          <p>작성된 커뮤니티 게시글이 없습니다. 첫 글의 주인공이 되어보세요!</p>
        </div>
      `;
      return;
    }

    filteredPosts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.addEventListener('click', () => {
        loadPostDetails(post.id);
      });
      
      const fileTag = post.attachment ? `<span class="meta-item">📎 파일</span>` : '';
      const dateStr = formatDate(post.createdAt);
      
      card.innerHTML = `
        <h4 class="post-card-title">${post.title}</h4>
        <p class="post-card-excerpt">${post.content.slice(0, 160)}${post.content.length > 160 ? '...' : ''}</p>
        <div class="post-card-meta">
          <div class="meta-left">
            <span class="post-card-author">${post.authorName}</span>
            <span class="meta-dot">•</span>
            <span>${dateStr}</span>
          </div>
          <div class="meta-right">
            ${fileTag}
            <span class="meta-item">💬 댓글 ${post.commentsCount || 0}</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadPostDetails(postId) {
  currentPostId = parseInt(postId);
  showSubView('post-detail-subview');
  
  try {
    const post = await dbCall('getPostById', postId);
    if (!post) {
      alert('게시글을 찾을 수 없습니다.');
      showSubView('post-list-subview');
      return;
    }
    
    document.getElementById('post-detail-title').textContent = post.title;
    document.getElementById('post-detail-author').textContent = post.authorName;
    document.getElementById('post-detail-date').textContent = formatDate(post.createdAt);
    document.getElementById('post-detail-content').textContent = post.content;
    
    const ownerActions = document.getElementById('post-owner-actions');
    if (currentUser && post.authorId === currentUser.id) {
      ownerActions.style.display = 'flex';
      
      const editBtn = document.getElementById('btn-edit-post');
      const deleteBtn = document.getElementById('btn-delete-post');
      
      const newEditBtn = editBtn.cloneNode(true);
      const newDeleteBtn = deleteBtn.cloneNode(true);
      editBtn.parentNode.replaceChild(newEditBtn, editBtn);
      deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
      
      newEditBtn.addEventListener('click', () => {
        openPostEditor(post);
      });
      newDeleteBtn.addEventListener('click', () => {
        deletePost(post.id);
      });
    } else {
      ownerActions.style.display = 'none';
    }
    
    const attachBox = document.getElementById('post-detail-attachment-box');
    if (post.attachment) {
      attachBox.style.display = 'flex';
      document.getElementById('post-detail-file-name').textContent = post.attachment.name;
      document.getElementById('post-detail-file-size').textContent = `(${formatBytes(post.attachment.size)})`;
      
      const link = document.getElementById('post-detail-file-path');
      link.onclick = (e) => {
        e.preventDefault();
        alert(`첨부파일 링크:\n${post.attachment.path}`);
      };
    } else {
      attachBox.style.display = 'none';
    }
    
    document.getElementById('comments-count').textContent = post.comments.length;
    renderComments(post.comments);
  } catch (e) {
    console.error(e);
  }
}

function renderComments(comments) {
  const container = document.getElementById('comments-list-container');
  container.innerHTML = '';
  
  if (comments.length === 0) {
    container.innerHTML = `<p style="color: var(--text-dark); font-size:13px; text-align: center; padding: 20px 0;">작성된 댓글이 없습니다. 첫 의견을 공유해보세요!</p>`;
    return;
  }
  
  comments.forEach(comment => {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.id = `comment-item-${comment.id}`;
    
    const isOwner = currentUser && comment.authorId === currentUser.id;
    const actionsHtml = isOwner ? `
      <div class="comment-actions">
        <button class="text-btn edit-btn" onclick="openCommentEditor(${comment.id}, '${comment.content.replace(/'/g, "\\'")}')">수정</button>
        <button class="text-btn delete-btn" onclick="deleteComment(${comment.id})">삭제</button>
      </div>
    ` : '';
    
    item.innerHTML = `
      <div class="comment-meta">
        <span class="comment-author">${comment.authorName}</span>
        <span>${formatDate(comment.createdAt)}</span>
        ${actionsHtml}
      </div>
      <div class="comment-content" id="comment-content-${comment.id}">${comment.content}</div>
    `;
    container.appendChild(item);
  });
}

function openPostEditor(post = null) {
  showSubView('post-write-subview');
  
  const titleField = document.getElementById('post-title-input');
  const contentField = document.getElementById('post-content-input');
  const idField = document.getElementById('write-post-id');
  const writeTitle = document.getElementById('write-view-title');
  
  const fileText = document.getElementById('attached-file-name');
  const btnRemove = document.getElementById('btn-remove-file');
  
  selectedAttachment = null;
  fileText.textContent = '선택된 파일 없음';
  btnRemove.style.display = 'none';

  if (post) {
    writeTitle.textContent = '게시글 수정';
    titleField.value = post.title;
    contentField.value = post.content;
    idField.value = post.id;
    if (post.attachment) {
      selectedAttachment = post.attachment;
      fileText.textContent = `${post.attachment.name} (${formatBytes(post.attachment.size)})`;
      btnRemove.style.display = 'inline-block';
    }
  } else {
    writeTitle.textContent = '새 커뮤니티 글 작성';
    titleField.value = '';
    contentField.value = '';
    idField.value = '';
  }
}

async function deletePost(postId) {
  if (!confirm('정말 이 게시글을 삭제하시겠습니까? 관련 댓글도 모두 삭제됩니다.')) return;
  
  try {
    const res = await dbCall('deletePost', postId, currentUser.id);
    if (res.success) {
      alert('게시글이 삭제되었습니다.');
      showSubView('post-list-subview');
      loadPostsList();
    } else {
      alert(res.message);
    }
  } catch (e) {
    console.error(e);
  }
}

window.openCommentEditor = function(commentId, oldContent) {
  const contentDiv = document.getElementById(`comment-content-${commentId}`);
  contentDiv.innerHTML = `
    <div class="comment-edit-box">
      <textarea id="comment-edit-input-${commentId}" rows="2">${oldContent}</textarea>
      <div class="comment-edit-actions">
        <button class="secondary-btn" onclick="cancelCommentEdit(${commentId}, '${oldContent.replace(/'/g, "\\'")}')">취소</button>
        <button class="primary-btn" onclick="submitCommentEdit(${commentId})">저장</button>
      </div>
    </div>
  `;
};

window.cancelCommentEdit = function(commentId, oldContent) {
  document.getElementById(`comment-content-${commentId}`).textContent = oldContent;
};

window.submitCommentEdit = async function(commentId) {
  const content = document.getElementById(`comment-edit-input-${commentId}`).value.trim();
  if (!content) return;
  
  try {
    const res = await dbCall('updateComment', commentId, content, currentUser.id);
    if (res.success) {
      loadPostDetails(currentPostId);
    } else {
      alert(res.message);
    }
  } catch (e) {
    console.error(e);
  }
};

window.deleteComment = async function(commentId) {
  if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return;
  
  try {
    const res = await dbCall('deleteComment', commentId, currentUser.id);
    if (res.success) {
      loadPostDetails(currentPostId);
    } else {
      alert(res.message);
    }
  } catch (e) {
    console.error(e);
  }
};


// --- 4. 회원인증 (LOGIN & SIGNUP) 로직 ---
function setupAuth() {
  const loginCard = document.getElementById('login-card');
  const signupCard = document.getElementById('signup-card');
  const btnToSignup = document.getElementById('btn-switch-to-signup');
  const btnToLogin = document.getElementById('btn-switch-to-login');
  
  btnToSignup.addEventListener('click', () => {
    loginCard.style.display = 'none';
    signupCard.style.display = 'block';
  });
  
  btnToLogin.addEventListener('click', () => {
    signupCard.style.display = 'none';
    loginCard.style.display = 'block';
  });

  const idInput = document.getElementById('signup-id');
  const idMsg = document.getElementById('id-status-msg');
  
  document.getElementById('btn-check-duplicate').addEventListener('click', async () => {
    const id = idInput.value.trim();
    if (!id) {
      idMsg.textContent = '아이디를 입력해주세요.';
      idMsg.className = 'id-status-msg taken';
      return;
    }
    
    try {
      const res = await dbCall('checkDuplicateId', id);
      if (res.exists) {
        idMsg.textContent = '이미 사용 중인 아이디입니다.';
        idMsg.className = 'id-status-msg taken';
      } else {
        idMsg.textContent = '사용 가능한 아이디입니다.';
        idMsg.className = 'id-status-msg available';
      }
    } catch (e) {
      console.error(e);
    }
  });

  document.getElementById('btn-signup-submit').addEventListener('click', async () => {
    const id = idInput.value.trim();
    const pw = document.getElementById('signup-pw').value;
    const pwConfirm = document.getElementById('signup-pw-confirm').value;
    const email = document.getElementById('signup-email').value.trim();
    const errorMsg = document.getElementById('signup-error-msg');
    
    errorMsg.textContent = '';
    
    if (!id || !pw || !pwConfirm || !email) {
      errorMsg.textContent = '모든 필드를 입력해 주세요.';
      return;
    }
    if (pw.length < 6) {
      errorMsg.textContent = '비밀번호는 최소 6자 이상이어야 합니다.';
      return;
    }
    if (pw !== pwConfirm) {
      errorMsg.textContent = '비밀번호 확인이 일치하지 않습니다.';
      return;
    }

    try {
      const res = await dbCall('registerUser', id, pw, email);
      if (res.success) {
        alert('회원가입에 성공했습니다! 로그인 페이지로 이동합니다.');
        signupCard.style.display = 'none';
        loginCard.style.display = 'block';
        document.getElementById('login-id').value = id;
      } else {
        errorMsg.textContent = res.message;
      }
    } catch (e) {
      console.error(e);
      errorMsg.textContent = '회원가입 처리 중 알 수 없는 에러가 발생했습니다.';
    }
  });

  document.getElementById('btn-login-submit').addEventListener('click', async () => {
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value;
    const remember = document.getElementById('login-remember').checked;
    const errorMsg = document.getElementById('login-error-msg');
    
    errorMsg.textContent = '';
    
    if (!id || !pw) {
      errorMsg.textContent = '아이디와 비밀번호를 모두 입력해 주세요.';
      return;
    }

    try {
      const res = await dbCall('loginUser', id, pw);
      if (res.success) {
        currentUser = res.user;
        updateUserSessionUI();
        
        // Always persist login session for GitHub Pages version
        localStorage.setItem('music_finder_user', JSON.stringify(currentUser));

        if (remember) {
          localStorage.setItem('music_finder_user', JSON.stringify(currentUser));
        }
        
        alert(`${currentUser.id}님, 환영합니다!`);
        switchView('lyrics-view');
      } else {
        errorMsg.textContent = res.message;
      }
    } catch (e) {
      console.error(e);
      errorMsg.textContent = '로그인 인증 중 에러가 발생했습니다.';
    }
  });
}


// --- 5. 마이페이지 로직 ---
function setupMyPage() {
  const tabPosts = document.getElementById('tab-btn-posts');
  const tabComments = document.getElementById('tab-btn-comments');
  
  tabPosts.addEventListener('click', () => {
    tabPosts.classList.add('active');
    tabComments.classList.remove('active');
    document.getElementById('mypage-posts-tab').style.display = 'block';
    document.getElementById('mypage-comments-tab').style.display = 'none';
  });
  
  tabComments.addEventListener('click', () => {
    tabComments.classList.add('active');
    tabPosts.classList.remove('active');
    document.getElementById('mypage-comments-tab').style.display = 'block';
    document.getElementById('mypage-posts-tab').style.display = 'none';
  });

  document.getElementById('btn-change-password-submit').addEventListener('click', async () => {
    const oldPw = document.getElementById('pw-change-current').value;
    const newPw = document.getElementById('pw-change-new').value;
    const confirmPw = document.getElementById('pw-change-confirm').value;
    const errorMsg = document.getElementById('pw-change-error');
    
    errorMsg.textContent = '';
    
    if (!oldPw || !newPw || !confirmPw) {
      errorMsg.textContent = '비밀번호 항목을 모두 입력해주세요.';
      return;
    }
    if (newPw.length < 6) {
      errorMsg.textContent = '새 비밀번호는 6자 이상 입력해주세요.';
      return;
    }
    if (newPw !== confirmPw) {
      errorMsg.textContent = '새 비밀번호 확인이 일치하지 않습니다.';
      return;
    }

    try {
      const res = await dbCall('changePassword', currentUser.id, oldPw, newPw);
      if (res.success) {
        alert('비밀번호가 성공적으로 변경되었습니다.');
        document.getElementById('pw-change-current').value = '';
        document.getElementById('pw-change-new').value = '';
        document.getElementById('pw-change-confirm').value = '';
      } else {
        errorMsg.textContent = res.message;
      }
    } catch (e) {
      console.error(e);
    }
  });
}

async function loadMyPageData() {
  if (!currentUser) return;
  
  document.getElementById('mypage-username').textContent = currentUser.id;
  document.getElementById('mypage-email').textContent = currentUser.email;
  document.getElementById('mypage-joined').textContent = formatDate(currentUser.createdAt);
  
  try {
    const userPosts = await dbCall('getUserPosts', currentUser.id);
    const postsListDiv = document.getElementById('mypage-posts-list');
    document.getElementById('my-posts-count').textContent = userPosts.length;
    postsListDiv.innerHTML = '';
    
    if (userPosts.length === 0) {
      postsListDiv.innerHTML = `<div style="text-align: center; padding: 30px 0; color: var(--text-dark); font-size:13px;">작성한 게시글이 아직 없습니다.</div>`;
    } else {
      userPosts.forEach(post => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-main">
            <a href="#" class="activity-title" onclick="goToPost(${post.id})">${post.title}</a>
            <span class="activity-subtitle">${post.content.slice(0, 80)}...</span>
          </div>
          <span class="activity-date">${formatDate(post.createdAt)}</span>
        `;
        postsListDiv.appendChild(item);
      });
    }
    
    const userComments = await dbCall('getUserComments', currentUser.id);
    const commentsListDiv = document.getElementById('mypage-comments-list');
    document.getElementById('my-comments-count').textContent = userComments.length;
    commentsListDiv.innerHTML = '';
    
    if (userComments.length === 0) {
      commentsListDiv.innerHTML = `<div style="text-align: center; padding: 30px 0; color: var(--text-dark); font-size:13px;">작성한 댓글이 아직 없습니다.</div>`;
    } else {
      userComments.forEach(comment => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-main">
            <a href="#" class="activity-title" onclick="goToPost(${comment.postId})">게시글: "${comment.postTitle}"</a>
            <span class="activity-comment-preview">내 댓글: "${comment.content}"</span>
          </div>
          <span class="activity-date">${formatDate(comment.createdAt)}</span>
        `;
        commentsListDiv.appendChild(item);
      });
    }
  } catch (e) {
    console.error(e);
  }
}

window.goToPost = function(postId) {
  switchView('community-view');
  loadPostDetails(postId);
};


// --- GLOBAL HELPERS ---
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
