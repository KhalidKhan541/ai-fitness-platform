export type Locale = "en" | "es" | "fr" | "de" | "pt" | "ja" | "zh" | "ko";

export interface Translation {
  [key: string]: string | Translation;
}

export interface I18nConfig {
  defaultLocale: Locale;
  locales: Locale[];
  fallbackLocale: Locale;
  cookieName: string;
}

const DEFAULT_CONFIG: I18nConfig = {
  defaultLocale: "en",
  locales: ["en", "es", "fr", "de", "pt", "ja", "zh", "ko"],
  fallbackLocale: "en",
  cookieName: "aifitness-locale",
};

const translations: Record<Locale, Translation> = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      remove: "Remove",
      confirm: "Confirm",
      back: "Back",
      next: "Next",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      noResults: "No results found",
    },
    nav: {
      dashboard: "Dashboard",
      workouts: "Workouts",
      nutrition: "Nutrition",
      progress: "Progress",
      goals: "Goals",
      challenges: "Challenges",
      social: "Social",
      settings: "Settings",
      profile: "Profile",
    },
    workout: {
      startWorkout: "Start Workout",
      endWorkout: "End Workout",
      pauseWorkout: "Pause Workout",
      resumeWorkout: "Resume Workout",
      addExercise: "Add Exercise",
      addSet: "Add Set",
      completeSet: "Complete Set",
      restTimer: "Rest Timer",
      sets: "Sets",
      reps: "Reps",
      weight: "Weight",
      duration: "Duration",
      distance: "Distance",
      notes: "Notes",
      history: "History",
    },
    nutrition: {
      logMeal: "Log Meal",
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
      snack: "Snack",
      calories: "Calories",
      protein: "Protein",
      carbs: "Carbs",
      fat: "Fat",
      water: "Water",
      dailyGoal: "Daily Goal",
      remaining: "Remaining",
    },
    progress: {
      logWeight: "Log Weight",
      takePhoto: "Take Photo",
      measurements: "Measurements",
      chest: "Chest",
      waist: "Waist",
      hips: "Hips",
      arms: "Arms",
      thighs: "Thighs",
      weightHistory: "Weight History",
    },
    goals: {
      createGoal: "Create Goal",
      targetWeight: "Target Weight",
      targetDate: "Target Date",
      progress: "Progress",
      achieved: "Achieved",
    },
    challenges: {
      joinChallenge: "Join Challenge",
      leaderboard: "Leaderboard",
      position: "Position",
      points: "Points",
    },
    social: {
      createPost: "Create Post",
      like: "Like",
      comment: "Comment",
      share: "Share",
      feed: "Feed",
    },
    settings: {
      account: "Account",
      subscription: "Subscription",
      notifications: "Notifications",
      privacy: "Privacy",
      appearance: "Appearance",
      language: "Language",
      units: "Units",
    },
    units: {
      kg: "kg",
      lbs: "lbs",
      km: "km",
      mi: "mi",
      cm: "cm",
      in: "in",
    },
  },
  es: {
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      add: "Agregar",
      remove: "Remover",
      confirm: "Confirmar",
      back: "Atrás",
      next: "Siguiente",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      noResults: "No se encontraron resultados",
    },
    nav: {
      dashboard: "Panel",
      workouts: "Entrenamientos",
      nutrition: "Nutrición",
      progress: "Progreso",
      goals: "Metas",
      challenges: "Desafíos",
      social: "Social",
      settings: "Configuración",
      profile: "Perfil",
    },
    workout: {
      startWorkout: "Iniciar Entrenamiento",
      endWorkout: "Finalizar Entrenamiento",
      pauseWorkout: "Pausar Entrenamiento",
      resumeWorkout: "Reanudar Entrenamiento",
      addExercise: "Agregar Ejercicio",
      addSet: "Agregar Serie",
      completeSet: "Completar Serie",
      restTimer: "Temporizador de Descanso",
      sets: "Series",
      reps: "Repeticiones",
      weight: "Peso",
      duration: "Duración",
      distance: "Distancia",
      notes: "Notas",
      history: "Historial",
    },
    nutrition: {
      logMeal: "Registrar Comida",
      breakfast: "Desayuno",
      lunch: "Almuerzo",
      dinner: "Cena",
      snack: "Snack",
      calories: "Calorías",
      protein: "Proteína",
      carbs: "Carbohidratos",
      fat: "Grasa",
      water: "Agua",
      dailyGoal: "Meta Diaria",
      remaining: "Restante",
    },
    progress: {
      logWeight: "Registrar Peso",
      takePhoto: "Tomar Foto",
      measurements: "Medidas",
      chest: "Pecho",
      waist: "Cintura",
      hips: "Caderas",
      arms: "Brazos",
      thighs: "Muslos",
      weightHistory: "Historial de Peso",
    },
    goals: {
      createGoal: "Crear Meta",
      targetWeight: "Peso Objetivo",
      targetDate: "Fecha Objetivo",
      progress: "Progreso",
      achieved: "Logrado",
    },
    challenges: {
      joinChallenge: "Unirse al Desafío",
      leaderboard: "Clasificación",
      position: "Posición",
      points: "Puntos",
    },
    social: {
      createPost: "Crear Publicación",
      like: "Me gusta",
      comment: "Comentar",
      share: "Compartir",
      feed: "Feed",
    },
    settings: {
      account: "Cuenta",
      subscription: "Suscripción",
      notifications: "Notificaciones",
      privacy: "Privacidad",
      appearance: "Apariencia",
      language: "Idioma",
      units: "Unidades",
    },
    units: {
      kg: "kg",
      lbs: "lbs",
      km: "km",
      mi: "mi",
      cm: "cm",
      in: "in",
    },
  },
  fr: {
    common: {
      save: "Enregistrer",
      cancel: "Annuler",
      delete: "Supprimer",
      edit: "Modifier",
      add: "Ajouter",
      remove: "Retirer",
      confirm: "Confirmer",
      back: "Retour",
      next: "Suivant",
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès",
      noResults: "Aucun résultat trouvé",
    },
    nav: {
      dashboard: "Tableau de bord",
      workouts: "Entraînements",
      nutrition: "Nutrition",
      progress: "Progrès",
      goals: "Objectifs",
      challenges: "Défis",
      social: "Social",
      settings: "Paramètres",
      profile: "Profil",
    },
    workout: {
      startWorkout: "Commencer l'entraînement",
      endWorkout: "Terminer l'entraînement",
      pauseWorkout: "Mettre en pause",
      resumeWorkout: "Reprendre",
      addExercise: "Ajouter un exercice",
      addSet: "Ajouter une série",
      completeSet: "Terminer la série",
      restTimer: "Minuteur de repos",
      sets: "Séries",
      reps: "Répétitions",
      weight: "Poids",
      duration: "Durée",
      distance: "Distance",
      notes: "Notes",
      history: "Historique",
    },
    nutrition: {
      logMeal: "Enregistrer un repas",
      breakfast: "Petit-déjeuner",
      lunch: "Déjeuner",
      dinner: "Dîner",
      snack: "Collation",
      calories: "Calories",
      protein: "Protéines",
      carbs: "Glucides",
      fat: "Lipides",
      water: "Eau",
      dailyGoal: "Objectif quotidien",
      remaining: "Restant",
    },
    progress: {
      logWeight: "Enregistrer le poids",
      takePhoto: "Prendre une photo",
      measurements: "Mesures",
      chest: "Poitrine",
      waist: "Taille",
      hips: "Hanches",
      arms: "Bras",
      thighs: "Cuisses",
      weightHistory: "Historique du poids",
    },
    goals: {
      createGoal: "Créer un objectif",
      targetWeight: "Poids cible",
      targetDate: "Date cible",
      progress: "Progrès",
      achieved: "Atteint",
    },
    challenges: {
      joinChallenge: "Rejoindre le défi",
      leaderboard: "Classement",
      position: "Position",
      points: "Points",
    },
    social: {
      createPost: "Créer une publication",
      like: "Aimer",
      comment: "Commenter",
      share: "Partager",
      feed: "Fil",
    },
    settings: {
      account: "Compte",
      subscription: "Abonnement",
      notifications: "Notifications",
      privacy: "Confidentialité",
      appearance: "Apparence",
      language: "Langue",
      units: "Unités",
    },
    units: {
      kg: "kg",
      lbs: "lbs",
      km: "km",
      mi: "mi",
      cm: "cm",
      in: "po",
    },
  },
  de: {
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      add: "Hinzufügen",
      remove: "Entfernen",
      confirm: "Bestätigen",
      back: "Zurück",
      next: "Weiter",
      loading: "Laden...",
      error: "Fehler",
      success: "Erfolg",
      noResults: "Keine Ergebnisse gefunden",
    },
    nav: {
      dashboard: "Dashboard",
      workouts: "Trainingseinheiten",
      nutrition: "Ernährung",
      progress: "Fortschritt",
      goals: "Ziele",
      challenges: "Herausforderungen",
      social: "Soziales",
      settings: "Einstellungen",
      profile: "Profil",
    },
  },
  pt: {
    common: {
      save: "Salvar",
      cancel: "Cancelar",
      delete: "Excluir",
      edit: "Editar",
      add: "Adicionar",
      remove: "Remover",
      confirm: "Confirmar",
      back: "Voltar",
      next: "Próximo",
      loading: "Carregando...",
      error: "Erro",
      success: "Sucesso",
      noResults: "Nenhum resultado encontrado",
    },
    nav: {
      dashboard: "Painel",
      workouts: "Treinos",
      nutrition: "Nutrição",
      progress: "Progresso",
      goals: "Metas",
      challenges: "Desafios",
      social: "Social",
      settings: "Configurações",
      profile: "Perfil",
    },
  },
  ja: {
    common: {
      save: "保存",
      cancel: "キャンセル",
      delete: "削除",
      edit: "編集",
      add: "追加",
      remove: "削除",
      confirm: "確認",
      back: "戻る",
      next: "次へ",
      loading: "読み込み中...",
      error: "エラー",
      success: "成功",
      noResults: "結果が見つかりません",
    },
    nav: {
      dashboard: "ダッシュボード",
      workouts: "ワークアウト",
      nutrition: "栄養",
      progress: "進捗",
      goals: "目標",
      challenges: "チャレンジ",
      social: "ソーシャル",
      settings: "設定",
      profile: "プロフィール",
    },
  },
  zh: {
    common: {
      save: "保存",
      cancel: "取消",
      delete: "删除",
      edit: "编辑",
      add: "添加",
      remove: "移除",
      confirm: "确认",
      back: "返回",
      next: "下一步",
      loading: "加载中...",
      error: "错误",
      success: "成功",
      noResults: "未找到结果",
    },
    nav: {
      dashboard: "仪表盘",
      workouts: "锻炼",
      nutrition: "营养",
      progress: "进度",
      goals: "目标",
      challenges: "挑战",
      social: "社交",
      settings: "设置",
      profile: "个人资料",
    },
  },
  ko: {
    common: {
      save: "저장",
      cancel: "취소",
      delete: "삭제",
      edit: "편집",
      add: "추가",
      remove: "제거",
      confirm: "확인",
      back: "뒤로",
      next: "다음",
      loading: "로딩...",
      error: "오류",
      success: "성공",
      noResults: "결과를 찾을 수 없습니다",
    },
    nav: {
      dashboard: "대시보드",
      workouts: "운동",
      nutrition: "영양",
      progress: "진행",
      goals: "목표",
      challenges: "챌린지",
      social: "소셜",
      settings: "설정",
      profile: "프로필",
    },
  },
};

let config: I18nConfig = { ...DEFAULT_CONFIG };
let currentLocale: Locale = DEFAULT_CONFIG.defaultLocale;

export function initI18n(locale: Locale = "en"): void {
  currentLocale = locale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("aifitness-locale", locale);
    document.cookie = `${config.cookieName}=${locale};path=/;max-age=31536000`;
  }
}

export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("aifitness-locale");
    if (stored && isValidLocale(stored)) return stored as Locale;
  }
  return currentLocale;
}

export function isValidLocale(locale: string): boolean {
  return config.locales.includes(locale as Locale);
}

export function t(
  path: string,
  params?: Record<string, string | number>
): string {
  const keys = path.split(".");
  let value: string | Translation | undefined = translations[currentLocale];

  for (const key of keys) {
    if (typeof value === "object" && value !== null) {
      value = (value as Translation)[key];
    } else {
      value = undefined;
      break;
    }
  }

  if (value === undefined) {
    value = translations[config.fallbackLocale];
    for (const key of keys) {
      if (typeof value === "object" && value !== null) {
        value = (value as Translation)[key];
      } else {
        value = path;
        break;
      }
    }
  }

  if (typeof value !== "string") return path;

  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey: string) => {
      return params[paramKey] !== undefined ? String(params[paramKey]) : `{{${paramKey}}}`;
    });
  }

  return value;
}

export function formatDateByLocale(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const localeMap: Record<Locale, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    pt: "pt-BR",
    ja: "ja-JP",
    zh: "zh-CN",
    ko: "ko-KR",
  };

  return new Intl.DateTimeFormat(localeMap[currentLocale] || "en-US", options).format(d);
}

export function formatNumberByLocale(value: number, decimals?: number): string {
  return new Intl.NumberFormat(localeMap[currentLocale] || "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const localeMap: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  ja: "ja-JP",
  zh: "zh-CN",
  ko: "ko-KR",
};

export function getLocaleConfig(): I18nConfig {
  return { ...config };
}

export function getAvailableLocales(): Locale[] {
  return [...config.locales];
}

export function getTranslationTree(locale?: Locale): Translation {
  return translations[locale || currentLocale] || translations.en;
}

export function pluralize(
  count: number,
  singular: string,
  plural: string
): string {
  return count === 1 ? singular : plural;
}

export function direction(): "ltr" | "rtl" {
  return "ltr";
}
