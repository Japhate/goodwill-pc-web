const deferredStylesheetSelector = 'link[rel="preload"][as="style"][data-deferred-stylesheet]';
const promotedStylesheets = new WeakSet();

function promoteDeferredStylesheet(link) {
  if (!(link instanceof HTMLLinkElement) || promotedStylesheets.has(link)) return;

  promotedStylesheets.add(link);
  link.rel = "stylesheet";
  link.removeAttribute("as");
  link.removeAttribute("data-deferred-stylesheet");
}

function promoteDeferredStylesheets(root = document) {
  root
    .querySelectorAll(deferredStylesheetSelector)
    .forEach(promoteDeferredStylesheet);
}

promoteDeferredStylesheets();

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;

      if (node.matches(deferredStylesheetSelector)) {
        promoteDeferredStylesheet(node);
        return;
      }

      promoteDeferredStylesheets(node);
    });
  });
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

window.addEventListener("load", () => observer.disconnect(), { once: true });
