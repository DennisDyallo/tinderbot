const { chromium } = require("playwright");
const path = require("path");
require('./logger');


class DOMInspector {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.userDataDir = path.join(__dirname, '..', 'browser-data');
    this.isMonitoring = false;
  }

  async connect() {
    console.info("🔍 DOM Inspector starting browser session...");

    try {
      // First try to launch persistent context (will work if no browser is running)
      // If browser is already running, this will fail and we'll use regular browser

      try {
        this.context = await chromium.launchPersistentContext(this.userDataDir, {
          headless: false,
          slowMo: 100,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
          ],
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          locale: "en-US",
          timezoneId: "Europe/Stockholm",
        });

        console.info("✅ Started new persistent browser session");

        // Get existing page or create new one
        const pages = this.context.pages();
        if (pages.length > 0) {
          this.page = pages[0];
          console.info("🔄 Using existing browser tab");

          // Check if already on Tinder
          const currentUrl = this.page.url();
          if (!currentUrl.includes('tinder.com')) {
            console.info("🌐 Navigating to Tinder...");
            await this.page.goto("https://tinder.com/app/recs", {
              waitUntil: "domcontentloaded",
            });
          } else {
            console.info("✅ Already on Tinder");
          }
        } else {
          this.page = await this.context.newPage();
          console.info("📄 Created new browser tab");
          await this.page.goto("https://tinder.com/app/recs", {
            waitUntil: "domcontentloaded",
          });
        }

      } catch (persistentError) {
        if (persistentError.message.includes("ProcessSingleton")) {
          console.info("🔄 Browser already running, starting in regular mode...");

          // Launch regular browser since persistent context is in use
          this.browser = await chromium.launch({
            headless: false,
            slowMo: 100,
            args: [
              "--disable-blink-features=AutomationControlled",
              "--disable-dev-shm-usage",
              "--no-sandbox",
            ],
          });

          this.context = await this.browser.newContext({
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale: "en-US",
            timezoneId: "Europe/Stockholm",
          });

          this.page = await this.context.newPage();
          console.info("📄 Created new browser window for inspection");

          await this.page.goto("https://tinder.com/app/recs", {
            waitUntil: "domcontentloaded",
          });
          console.info("🌐 Navigated to Tinder in new window");
        } else {
          throw persistentError;
        }
      }

      // Add anti-detection script
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
      });

      await this.injectInspectionScript();
      console.info("🎯 DOM Inspector ready! Click on elements to capture their information.");

    } catch (error) {
      console.error("❌ Failed to connect:", error.message);
      throw error;
    }
  }

  async injectInspectionScript() {
    // First inject for future page loads
    await this.page.addInitScript(() => {
      // Prevent multiple injection
      if (window.domInspectorInjected) return;
      window.domInspectorInjected = true;

      // Store original console.info to avoid interference
      const originalLog = console.info;

      // MutationObserver for monitoring DOM changes
      const profileCardObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Check for added nodes that might be profile cards
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Look for Tinder profile card patterns
                if (node.matches && (
                  node.matches('[data-testid*="card"]') ||
                  node.matches('.Expand') ||
                  node.matches('[class*="card"]') ||
                  node.matches('[class*="Card"]') ||
                  node.querySelector('[data-testid*="card"]') ||
                  node.querySelector('.Expand')
                )) {
                  originalLog('🔄 DOM_CHANGE_ADDED:', {
                    type: 'PROFILE_CARD_ADDED',
                    timestamp: new Date().toISOString(),
                    element: {
                      tagName: node.tagName,
                      className: node.className,
                      id: node.id,
                      attributes: Array.from(node.attributes || []).map(attr => ({
                        name: attr.name,
                        value: attr.value
                      }))
                    },
                    cardCount: document.querySelectorAll('[data-testid*="card"], .Expand, [class*="card"], [class*="Card"]').length
                  });
                }
              }
            });

            // Check for removed nodes that might be profile cards
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Look for Tinder profile card patterns
                if (node.matches && (
                  node.matches('[data-testid*="card"]') ||
                  node.matches('.Expand') ||
                  node.matches('[class*="card"]') ||
                  node.matches('[class*="Card"]') ||
                  node.querySelector('[data-testid*="card"]') ||
                  node.querySelector('.Expand')
                )) {
                  originalLog('🔄 DOM_CHANGE_REMOVED:', {
                    type: 'PROFILE_CARD_REMOVED',
                    timestamp: new Date().toISOString(),
                    element: {
                      tagName: node.tagName,
                      className: node.className,
                      id: node.id,
                      attributes: Array.from(node.attributes || []).map(attr => ({
                        name: attr.name,
                        value: attr.value
                      }))
                    },
                    cardCount: document.querySelectorAll('[data-testid*="card"], .Expand, [class*="card"], [class*="Card"]').length
                  });
                }
              }
            });
          }

          // Monitor attribute changes that might indicate card state changes
          if (mutation.type === 'attributes') {
            const node = mutation.target;
            if (node.matches && (
              node.matches('[data-testid*="card"]') ||
              node.matches('.Expand') ||
              node.matches('[class*="card"]') ||
              node.matches('[class*="Card"]')
            )) {
              originalLog('🔄 DOM_CHANGE_ATTRIBUTE:', {
                type: 'PROFILE_CARD_ATTRIBUTE_CHANGED',
                timestamp: new Date().toISOString(),
                attributeName: mutation.attributeName,
                oldValue: mutation.oldValue,
                newValue: node.getAttribute(mutation.attributeName),
                element: {
                  tagName: node.tagName,
                  className: node.className,
                  id: node.id
                }
              });
            }
          }
        });
      });

      // Start observing DOM changes
      setTimeout(() => {
        profileCardObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeOldValue: true,
          attributeFilter: ['class', 'style', 'data-testid', 'aria-hidden']
        });
        originalLog('🔍 MutationObserver started monitoring profile card changes');

        // Log initial card count
        const initialCards = document.querySelectorAll('[data-testid*="card"], .Expand, [class*="card"], [class*="Card"]');
        originalLog('📊 Initial profile card count:', initialCards.length);
      }, 1000);

      // Swipe action monitoring
      let lastKeyPress = null;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
          lastKeyPress = {
            key: e.key,
            timestamp: new Date().toISOString(),
            action: e.key === 'ArrowLeft' ? 'NOPE' : e.key === 'ArrowRight' ? 'LIKE' : 'VIEW_PHOTO'
          };
          originalLog('⌨️  SWIPE_ACTION:', lastKeyPress);
        }
      });

      // Element highlighting style
      const highlightStyle = `
        outline: 3px solid #ff6b6b !important;
        outline-offset: 2px !important;
        background-color: rgba(255, 107, 107, 0.1) !important;
      `;

      let highlightedElement = null;

      // Function to get comprehensive element info
      function getElementInfo(element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        // Generate multiple selector options
        const selectors = [];

        // ID selector
        if (element.id) {
          selectors.push(`#${element.id}`);
        }

        // Class selectors
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).filter(c => c);
          if (classes.length > 0) {
            selectors.push(`.${classes.join('.')}`);
            // Single class selectors
            classes.forEach(cls => selectors.push(`.${cls}`));
          }
        }

        // Attribute selectors
        for (let attr of element.attributes) {
          if (attr.name !== 'class' && attr.name !== 'id') {
            selectors.push(`[${attr.name}="${attr.value}"]`);
            selectors.push(`[${attr.name}]`);
          }
        }

        // Tag selector
        selectors.push(element.tagName.toLowerCase());

        // Text-based selectors
        const textContent = element.textContent?.trim();
        if (textContent && textContent.length < 50) {
          selectors.push(`text="${textContent}"`);
          selectors.push(`text*="${textContent.substring(0, 20)}"`);
        }

        // Aria label selectors
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
          selectors.push(`[aria-label="${ariaLabel}"]`);
        }

        // Data attribute selectors
        for (let attr of element.attributes) {
          if (attr.name.startsWith('data-')) {
            selectors.push(`[${attr.name}="${attr.value}"]`);
          }
        }

        // CSS path
        function getCSSPath(el) {
          const path = [];
          while (el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
              selector += '#' + el.id;
              path.unshift(selector);
              break;
            } else {
              let sib = el;
              let nth = 1;
              while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() === selector) nth++;
              }
              if (nth !== 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            el = el.parentNode;
          }
          return path.join(' > ');
        }

        return {
          tagName: element.tagName,
          id: element.id || null,
          className: element.className || null,
          textContent: textContent?.substring(0, 100) || null,
          innerHTML: element.innerHTML?.substring(0, 200) || null,
          attributes: Array.from(element.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
          })),
          selectors: [...new Set(selectors)], // Remove duplicates
          cssPath: getCSSPath(element),
          position: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          visibility: {
            visible: rect.width > 0 && rect.height > 0,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity
          },
          parentInfo: element.parentElement ? {
            tagName: element.parentElement.tagName,
            id: element.parentElement.id || null,
            className: element.parentElement.className || null
          } : null,
          timestamp: new Date().toISOString()
        };
      }

      // Mouse over highlighting
      document.addEventListener('mouseover', (e) => {
        // Don't prevent default behavior - let events work normally

        // Remove previous highlight
        if (highlightedElement) {
          highlightedElement.style.cssText = highlightedElement.style.cssText.replace(highlightStyle, '');
        }

        // Add new highlight
        highlightedElement = e.target;
        highlightedElement.style.cssText += highlightStyle;
      }, true);

      // Click event listener
      document.addEventListener('click', (e) => {
        // Don't prevent default behavior - let events work normally

        const elementInfo = getElementInfo(e.target);

        // Log with special prefix for easy filtering
        originalLog('🎯 DOM_INSPECTOR_CLICK:', JSON.stringify(elementInfo, null, 2));

        // Also create a more readable summary
        originalLog(`
╔══════════════════════════════════════════════════════════════════
║ 🎯 ELEMENT CLICKED
╠══════════════════════════════════════════════════════════════════
║ Tag: ${elementInfo.tagName}
║ Text: ${elementInfo.textContent || 'N/A'}
║ ID: ${elementInfo.id || 'N/A'}
║ Classes: ${elementInfo.className || 'N/A'}
║
║ 🎯 TOP SELECTORS:
${elementInfo.selectors.slice(0, 5).map(s => `║   ${s}`).join('\n')}
║
║ 📍 CSS Path: ${elementInfo.cssPath}
║
║ 📊 Position: ${elementInfo.position.x}, ${elementInfo.position.y} (${elementInfo.position.width}x${elementInfo.position.height})
╚══════════════════════════════════════════════════════════════════
        `);

        // Let the event continue normally
      }, true);

      // Keyboard shortcut to toggle monitoring
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault();
          originalLog('🔍 DOM Inspector toggled');
        }
      });

      originalLog('🎯 DOM Inspector injected! Click on elements to see their information.');
    });

    // Also inject directly into the current page (for already loaded pages)
    await this.page.evaluate(() => {
      // Prevent multiple injection
      if (window.domInspectorInjected) return;
      window.domInspectorInjected = true;

      // Store original console.info to avoid interference
      const originalLog = console.info;

      // MutationObserver for monitoring DOM changes
      const profileCardObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Check for added nodes that might be profile cards
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Look for Tinder profile card patterns
                if (node.matches && (
                  node.matches('[data-testid*="card"]') ||
                  node.matches('.Expand') ||
                  node.matches('[class*="card"]') ||
                  node.matches('[class*="Card"]') ||
                  node.querySelector('[data-testid*="card"]') ||
                  node.querySelector('.Expand')
                )) {
                  originalLog('🔄 DOM_CHANGE_ADDED:', {
                    type: 'PROFILE_CARD_ADDED',
                    timestamp: new Date().toISOString(),
                    element: {
                      tagName: node.tagName,
                      className: node.className,
                      id: node.id,
                      attributes: Array.from(node.attributes || []).map(attr => ({
                        name: attr.name,
                        value: attr.value
                      }))
                    },
                    cardCount: document.querySelectorAll('[data-testid*="card"], .Expand, [class*="card"], [class*="Card"]').length
                  });
                }
              }
            });

            // Check for removed nodes that might be profile cards
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Look for Tinder profile card patterns
                if (node.matches && (
                  node.matches('[data-testid*="card"]') ||
                  node.matches('.Expand') ||
                  node.matches('[class*="card"]') ||
                  node.matches('[class*="Card"]') ||
                  node.querySelector('[data-testid*="card"]') ||
                  node.querySelector('.Expand')
                )) {
                  originalLog('🔄 DOM_CHANGE_REMOVED:', {
                    type: 'PROFILE_CARD_REMOVED',
                    timestamp: new Date().toISOString(),
                    element: {
                      tagName: node.tagName,
                      className: node.className,
                      id: node.id,
                      attributes: Array.from(node.attributes || []).map(attr => ({
                        name: attr.name,
                        value: attr.value
                      }))
                    },
                    cardCount: document.querySelectorAll('[data-testid*="card"], .Expand, [class*="card"], [class*="Card"]').length
                  });
                }
              }
            });
          }

          // Monitor attribute changes that might indicate card state changes
          if (mutation.type === 'attributes') {
            const node = mutation.target;
            if (node.matches && (
              node.matches('[data-testid*="card"]') ||
              node.matches('.Expand') ||
              node.matches('[class*="card"]') ||
              node.matches('[class*="Card"]')
            )) {
              originalLog('🔄 DOM_CHANGE_ATTRIBUTE:', {
                type: 'PROFILE_CARD_ATTRIBUTE_CHANGED',
                timestamp: new Date().toISOString(),
                attributeName: mutation.attributeName,
                oldValue: mutation.oldValue,
                newValue: node.getAttribute(mutation.attributeName),
                element: {
                  tagName: node.tagName,
                  className: node.className,
                  id: node.id
                }
              });
            }
          }
        });
      });

      // Start observing DOM changes
      setTimeout(() => {
        profileCardObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeOldValue: true,
          attributeFilter: ['class', 'style', 'data-testid', 'aria-hidden']
        });
        originalLog('🔍 MutationObserver started monitoring profile card changes');

        // Log initial card count
        const initialCards = document.querySelectorAll('[data-testid*="card"], .Expand, [class*="card"], [class*="Card"]');
        originalLog('📊 Initial profile card count:', initialCards.length);
      }, 1000);

      // Swipe action monitoring
      let lastKeyPress = null;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
          lastKeyPress = {
            key: e.key,
            timestamp: new Date().toISOString(),
            action: e.key === 'ArrowLeft' ? 'NOPE' : e.key === 'ArrowRight' ? 'LIKE' : 'VIEW_PHOTO'
          };
          originalLog('⌨️  SWIPE_ACTION:', lastKeyPress);
        }
      });

      // Element highlighting style
      const highlightStyle = `
        outline: 3px solid #ff6b6b !important;
        outline-offset: 2px !important;
        background-color: rgba(255, 107, 107, 0.1) !important;
      `;

      let highlightedElement = null;

      // Function to get comprehensive element info
      function getElementInfo(element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        // Generate multiple selector options
        const selectors = [];

        // ID selector
        if (element.id) {
          selectors.push(`#${element.id}`);
        }

        // Class selectors
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).filter(c => c);
          if (classes.length > 0) {
            selectors.push(`.${classes.join('.')}`);
            // Single class selectors
            classes.forEach(cls => selectors.push(`.${cls}`));
          }
        }

        // Attribute selectors
        for (let attr of element.attributes) {
          if (attr.name !== 'class' && attr.name !== 'id') {
            selectors.push(`[${attr.name}="${attr.value}"]`);
            selectors.push(`[${attr.name}]`);
          }
        }

        // Tag selector
        selectors.push(element.tagName.toLowerCase());

        // Text-based selectors
        const textContent = element.textContent?.trim();
        if (textContent && textContent.length < 50) {
          selectors.push(`text="${textContent}"`);
          selectors.push(`text*="${textContent.substring(0, 20)}"`);
        }

        // Aria label selectors
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
          selectors.push(`[aria-label="${ariaLabel}"]`);
        }

        // Data attribute selectors
        for (let attr of element.attributes) {
          if (attr.name.startsWith('data-')) {
            selectors.push(`[${attr.name}="${attr.value}"]`);
          }
        }

        // CSS path
        function getCSSPath(el) {
          const path = [];
          while (el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
              selector += '#' + el.id;
              path.unshift(selector);
              break;
            } else {
              let sib = el;
              let nth = 1;
              while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() === selector) nth++;
              }
              if (nth !== 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            el = el.parentNode;
          }
          return path.join(' > ');
        }

        return {
          tagName: element.tagName,
          id: element.id || null,
          className: element.className || null,
          textContent: textContent?.substring(0, 100) || null,
          innerHTML: element.innerHTML?.substring(0, 200) || null,
          attributes: Array.from(element.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
          })),
          selectors: [...new Set(selectors)], // Remove duplicates
          cssPath: getCSSPath(element),
          position: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          visibility: {
            visible: rect.width > 0 && rect.height > 0,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity
          },
          parentInfo: element.parentElement ? {
            tagName: element.parentElement.tagName,
            id: element.parentElement.id || null,
            className: element.parentElement.className || null
          } : null,
          timestamp: new Date().toISOString()
        };
      }

      // Mouse over highlighting
      document.addEventListener('mouseover', (e) => {
        // Don't prevent default behavior - let events work normally

        // Remove previous highlight
        if (highlightedElement) {
          highlightedElement.style.cssText = highlightedElement.style.cssText.replace(highlightStyle, '');
        }

        // Add new highlight
        highlightedElement = e.target;
        highlightedElement.style.cssText += highlightStyle;
      }, true);

      // Click event listener
      document.addEventListener('click', (e) => {
        // Don't prevent default behavior - let events work normally

        const elementInfo = getElementInfo(e.target);

        // Log with special prefix for easy filtering
        originalLog('🎯 DOM_INSPECTOR_CLICK:', JSON.stringify(elementInfo, null, 2));

        // Also create a more readable summary
        originalLog(`
╔══════════════════════════════════════════════════════════════════
║ 🎯 ELEMENT CLICKED
╠══════════════════════════════════════════════════════════════════
║ Tag: ${elementInfo.tagName}
║ Text: ${elementInfo.textContent || 'N/A'}
║ ID: ${elementInfo.id || 'N/A'}
║ Classes: ${elementInfo.className || 'N/A'}
║
║ 🎯 TOP SELECTORS:
${elementInfo.selectors.slice(0, 5).map(s => `║   ${s}`).join('\n')}
║
║ 📍 CSS Path: ${elementInfo.cssPath}
║
║ 📊 Position: ${elementInfo.position.x}, ${elementInfo.position.y} (${elementInfo.position.width}x${elementInfo.position.height})
╚══════════════════════════════════════════════════════════════════
        `);

        // Let the event continue normally
      }, true);

      originalLog('🎯 DOM Inspector injected into current page! Click on elements to see their information.');
    });

    // Listen for console messages from the page
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('DOM_INSPECTOR_CLICK:') ||
          text.includes('DOM_CHANGE_ADDED:') ||
          text.includes('DOM_CHANGE_REMOVED:') ||
          text.includes('DOM_CHANGE_ATTRIBUTE:') ||
          text.includes('SWIPE_ACTION:') ||
          text.includes('🎯') ||
          text.includes('🔄') ||
          text.includes('⌨️') ||
          text.includes('🔍') ||
          text.includes('📊')) {
        console.info(text);
      }
    });
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      console.info("⚠️  Already monitoring");
      return;
    }

    this.isMonitoring = true;
    console.info(`
╔════════════════════════════════════════════════════════════════════════════
║ 🎯 DOM INSPECTOR ACTIVE
╠════════════════════════════════════════════════════════════════════════════
║ Instructions:
║ • Hover over elements to highlight them
║ • Click on elements to capture their DOM information
║ • All element data will be logged to this console
║ • Press Ctrl+C to stop monitoring
║
║ Current page: ${this.page.url()}
╚════════════════════════════════════════════════════════════════════════════
`);

    // Keep the process alive and monitor
    process.on('SIGINT', () => {
      console.info('\n🛑 Stopping DOM Inspector...');
      this.stop();
    });

    // Keep monitoring until stopped
    while (this.isMonitoring) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async stop() {
    this.isMonitoring = false;
    console.info("🛑 DOM Inspector stopped");

    try {
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.error("⚠️  Cleanup error:", error.message);
    }

    process.exit(0);
  }

  async captureCurrentPageInfo() {
    const url = this.page.url();
    const title = await this.page.title();

    console.info(`
╔════════════════════════════════════════════════════════════════════════════
║ 📄 CURRENT PAGE INFO
╠════════════════════════════════════════════════════════════════════════════
║ URL: ${url}
║ Title: ${title}
║ Ready for interaction...
╚════════════════════════════════════════════════════════════════════════════
`);
  }
}

module.exports = DOMInspector;