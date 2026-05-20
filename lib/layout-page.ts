/** Отступ снизу страницы под нижнее меню. */
export const appBottomNavClearanceClass =
  "pb-[calc(5rem+env(safe-area-inset-bottom))]";

/** Доп. отступ под закреплённую кнопку над нижним меню. */
export const appBottomActionClearanceClass =
  "max-md:pb-[calc(9rem+env(safe-area-inset-bottom))]";

/** Позиция над нижним меню на мобильном (min-h 56px + safe-area). */
export const appAboveBottomNavClass =
  "max-md:bottom-[calc(3.5rem+env(safe-area-inset-bottom))]";

/** Внешний контейнер: мобильный отступ под бургер, десктоп — полоса справа от сайдбара. */
export const appPageClass =
  `data-app-page mx-auto min-h-screen w-full max-w-lg px-4 ${appBottomNavClearanceClass} pt-[calc(env(safe-area-inset-top)+4rem)] md:mx-0 md:max-w-none md:px-0 md:pl-56 md:pt-8 md:pb-8 md:flex md:justify-center`;

/** Внутренний блок — по центру оставшейся ширины на десктопе. */
export const appPageContentClass = "w-full max-w-2xl px-0 md:px-16";

/** Страницы с бургером: одна строка с меню (layout pt 4rem → бургер 1.5rem). */
export const appMainClass = "w-full pb-8 max-md:-mt-10 max-md:pt-0 md:pt-6";

/** @deprecated Используйте appMainClass */
export const arenaMainClass = appMainClass;
