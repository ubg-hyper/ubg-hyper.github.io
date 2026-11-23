(function () {
  const gameFrames = document.querySelectorAll(
    '.game-frame-container iframe.game-frame, iframe#game-iframe'
  );

  if (!gameFrames.length) {
    return;
  }

  const assetPrefix = /\/games\/[^/]+$/.test(window.location.pathname) ? '../' : '';

  function normalizeTitle(value) {
    return (value || '')
      .replace(/\s*-\s*unblocked(?:\s+game)?\s*$/i, '')
      .replace(/\bunblocked\b/gi, '')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .toLowerCase();
  }

  function localizeSiteImage(source) {
    if (!source) {
      return '';
    }

    const imageUrl = new URL(source, document.baseURI);
    if (imageUrl.hostname === 'ubg-hyper.github.io') {
      return new URL(
        imageUrl.pathname + imageUrl.search + imageUrl.hash,
        window.location.origin
      ).href;
    }
    return imageUrl.href;
  }

  function getPosterSources(title) {
    const normalizedTitle = normalizeTitle(title);
    const matchingImage = Array.from(document.querySelectorAll('img[alt]')).find(function (image) {
      return normalizeTitle(image.alt) === normalizedTitle;
    });
    const metaImage = document.querySelector('meta[property="og:image"]');
    const metaSource = metaImage ? localizeSiteImage(metaImage.content) : '';
    const metaIsLogo = /\/assets\/logo\.(?:png|jpe?g|webp)$/i.test(metaSource);
    const sources = [];

    function addSource(source) {
      const resolved = localizeSiteImage(source);
      if (resolved && !sources.includes(resolved)) {
        sources.push(resolved);
      }
    }

    if (matchingImage) {
      addSource(matchingImage.currentSrc || matchingImage.src);
    }
    if (metaSource && !metaIsLogo) {
      addSource(metaSource);
    }

    const titleSlug = normalizedTitle.replace(/\s+/g, '-');
    const posterSlugs = [titleSlug, titleSlug.replace(/-\d+$/, '')];
    posterSlugs.forEach(function (slug) {
      addSource(assetPrefix + 'games-data/' + slug + '.png');
    });

    if (metaSource) {
      addSource(metaSource);
    }

    return sources;
  }

  gameFrames.forEach(function (frame) {
    const container = frame.closest('.game-frame-container') ||
      frame.closest('.game-frame') ||
      frame.parentElement;
    const pageHeading = document.querySelector('h1');
    const gameTitle = (frame.getAttribute('title') || '').replace(
      /\s*-\s*unblocked(?:\s+game)?\s*$/i,
      ''
    ).trim() || (pageHeading ? pageHeading.textContent.trim() : '');
    const gameSource = frame.getAttribute('data-game-src') || frame.getAttribute('src');

    if (!container || !gameSource || container.querySelector('.game-launch-overlay')) {
      return;
    }

    const posterSources = getPosterSources(gameTitle);
    const overlay = document.createElement('div');
    const poster = document.createElement('img');
    const content = document.createElement('div');
    const title = document.createElement('h2');
    const button = document.createElement('button');
    const playIcon = document.createElement('span');

    container.classList.add('game-launch-container', 'game-launch-ready');
    frame.classList.add('game-launch-frame');
    frame.removeAttribute('src');
    frame.setAttribute('tabindex', '-1');

    overlay.className = 'game-launch-overlay';
    poster.className = 'game-launch-poster';
    poster.alt = '';
    poster.setAttribute('aria-hidden', 'true');
    poster.loading = 'eager';
    poster.decoding = 'async';
    content.className = 'game-launch-content';
    title.className = 'game-launch-title';
    title.textContent = gameTitle || 'Ready to play?';
    button.className = 'game-launch-button';
    button.type = 'button';
    playIcon.className = 'game-launch-play-icon';
    playIcon.setAttribute('aria-hidden', 'true');
    button.appendChild(playIcon);
    button.appendChild(document.createTextNode('Play now'));
    button.setAttribute('aria-label', 'Play ' + (gameTitle || 'game'));

    let posterIndex = 0;
    function setNextPoster() {
      if (posterIndex >= posterSources.length) {
        container.style.removeProperty('--game-launch-image');
        poster.remove();
        return;
      }
      const source = posterSources[posterIndex++];
      container.style.setProperty(
        '--game-launch-image',
        'url("' + source.replace(/["\\]/g, '\\$&') + '")'
      );
      poster.src = source;
    }

    poster.addEventListener('error', setNextPoster);
    overlay.appendChild(poster);
    content.appendChild(title);
    content.appendChild(button);
    overlay.appendChild(content);
    container.appendChild(overlay);
    setNextPoster();

    const controls = container.closest('.game-player');
    const controlButtons = controls
      ? Array.from(controls.querySelectorAll('.game-player__controls button'))
      : [];
    const previousDisabledStates = controlButtons.map(function (controlButton) {
      const wasDisabled = controlButton.disabled;
      controlButton.disabled = true;
      return wasDisabled;
    });

    button.addEventListener('click', function () {
      frame.setAttribute('src', gameSource);
      frame.removeAttribute('data-game-src');
      frame.removeAttribute('tabindex');
      frame.loading = 'eager';
      container.classList.add('game-launch-started');
      overlay.remove();
      controlButtons.forEach(function (controlButton, index) {
        controlButton.disabled = previousDisabledStates[index];
      });
      frame.focus();
    }, { once: true });
  });
})();
