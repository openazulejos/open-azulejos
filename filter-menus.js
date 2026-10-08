"use strict";

// Enhance the existing selects; their values and change events remain the filter contract.
(() => {
  let activeMenu = null;

  document.querySelectorAll(".azulejo-filter-bar select").forEach((select) => {
    const label = select.closest("label");
    if (!label) return;
    const name = label.querySelector(".sr-only")?.textContent.trim() || "filter";
    const wrapper = document.createElement("div");
    wrapper.className = "azulejo-filter-menu";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = `${select.id}Button`;
    trigger.className = "azulejo-filter-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const text = document.createElement("span");
    const arrow = document.createElement("span");
    arrow.className = "view-switch-arrow";
    arrow.setAttribute("aria-hidden", "true");
    trigger.append(text, arrow);
    const menu = document.createElement("div");
    menu.id = `${select.id}Menu`;
    menu.className = "view-switch-menu azulejo-filter-options";
    menu.hidden = true;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", name);
    trigger.setAttribute("aria-controls", menu.id);
    label.replaceWith(wrapper);
    wrapper.append(label, trigger, menu);
    label.hidden = true;
    label.style.display = "none";

    const buttons = () => [...menu.querySelectorAll("button:not(:disabled)")];
    const close = (restoreFocus = false) => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (activeMenu?.wrapper === wrapper) activeMenu = null;
      if (restoreFocus) trigger.focus();
    };

    function sync() {
      const focusedValue = menu.contains(document.activeElement) ? document.activeElement.dataset.value : null;
      const selected = select.selectedOptions[0];
      text.textContent = selected?.textContent || "";
      trigger.setAttribute("aria-label", `${name}: ${text.textContent}`);
      trigger.disabled = select.disabled;
      menu.replaceChildren();
      [...select.options].forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.tabIndex = -1;
        button.dataset.value = option.value;
        button.textContent = option.textContent;
        button.disabled = option.disabled;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(option.value === select.value));
        button.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          close(true);
        });
        menu.append(button);
      });
      if (select.disabled) close();
      else if (!menu.hidden && focusedValue !== null) {
        buttons().find((button) => button.dataset.value === focusedValue)?.focus();
      }
    }

    function open(edge) {
      if (select.disabled) return;
      search = "";
      activeMenu?.close();
      sync();
      menu.style.setProperty("--filter-menu-offset", "0px");
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      activeMenu = { wrapper, close };
      const rect = menu.getBoundingClientRect();
      const offset = rect.left < 12 ? 12 - rect.left : Math.min(0, innerWidth - 12 - rect.right);
      menu.style.setProperty("--filter-menu-offset", `${offset}px`);
      menu.style.setProperty("--filter-menu-top", `${rect.top + 4}px`);
      const options = buttons();
      const target = edge === "last" ? options.at(-1) : edge === "first" ? options[0]
        : options.find((button) => button.getAttribute("aria-selected") === "true") || options[0];
      target?.focus({ preventScroll: true });
      if (target) menu.scrollTop = Math.max(0, target.offsetTop - menu.clientHeight / 2);
    }

    trigger.addEventListener("click", () => menu.hidden ? open() : close());
    trigger.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      open(event.key === "End" ? "last" : event.key === "Home" ? "first" : undefined);
    });
    let search = "";
    let searchTime = 0;
    menu.addEventListener("keydown", (event) => {
      const options = buttons();
      const index = options.indexOf(document.activeElement);
      let next;
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key === "Tab") {
        setTimeout(() => close(), 0);
        return;
      }
      if (event.key === "ArrowDown") next = options[(index + 1) % options.length];
      else if (event.key === "ArrowUp") next = options[(index - 1 + options.length) % options.length];
      else if (event.key === "Home") next = options[0];
      else if (event.key === "End") next = options.at(-1);
      else if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
        search = Date.now() - searchTime < 700 ? search + event.key.toLowerCase() : event.key.toLowerCase();
        searchTime = Date.now();
        next = options.find((button) => button.textContent.toLowerCase().startsWith(search));
      } else return;
      event.preventDefault();
      next?.focus();
    });
    select.addEventListener("change", sync);
    new MutationObserver(sync).observe(select, { childList: true, subtree: true, characterData: true, attributes: true });
    sync();
  });

  document.addEventListener("pointerdown", (event) => {
    if (activeMenu && !activeMenu.wrapper.contains(event.target)) activeMenu.close();
  });
  document.addEventListener("focusin", (event) => {
    if (activeMenu && !activeMenu.wrapper.contains(event.target)) activeMenu.close();
  });
  window.addEventListener("resize", () => activeMenu?.close());
})();
