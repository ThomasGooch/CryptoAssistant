import { createContext, useContext, useReducer, useEffect } from "react";
import type { ReactNode } from "react";
import type {
  UserPreferences,
  ChartPreferences,
  IndicatorPreference,
  UIPreferences,
} from "../types/domain";
import { preferencesService } from "../services/preferencesService";

// Actions
type PreferencesAction =
  | { type: "SET_PREFERENCES"; payload: UserPreferences }
  | { type: "UPDATE_CHART_PREFERENCES"; payload: ChartPreferences }
  | { type: "UPDATE_INDICATORS"; payload: IndicatorPreference[] }
  | { type: "ADD_FAVORITE_PAIR"; payload: string }
  | { type: "REMOVE_FAVORITE_PAIR"; payload: string }
  | { type: "UPDATE_UI_PREFERENCES"; payload: UIPreferences }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

// State
interface PreferencesState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
}

// Context
interface PreferencesContextType {
  state: PreferencesState;
  actions: {
    loadPreferences: (userId: string) => Promise<void>;
    updateChartPreferences: (
      chartPreferences: ChartPreferences,
    ) => Promise<void>;
    updateIndicators: (indicators: IndicatorPreference[]) => Promise<void>;
    addFavoritePair: (pair: string) => Promise<void>;
    removeFavoritePair: (pair: string) => Promise<void>;
    updateUIPreferences: (uiPreferences: UIPreferences) => Promise<void>;
    resetToDefaults: () => Promise<void>;
  };
}

// Initial state
const initialState: PreferencesState = {
  preferences: null,
  isLoading: false,
  error: null,
};

// Reducer
function preferencesReducer(
  state: PreferencesState,
  action: PreferencesAction,
): PreferencesState {
  switch (action.type) {
    case "SET_PREFERENCES":
      return {
        ...state,
        preferences: action.payload,
        isLoading: false,
        error: null,
      };
    case "UPDATE_CHART_PREFERENCES":
      if (!state.preferences) return state;
      return {
        ...state,
        preferences: {
          ...state.preferences,
          chart: action.payload,
          lastUpdated: new Date().toISOString(),
        },
      };
    case "UPDATE_INDICATORS":
      if (!state.preferences) return state;
      return {
        ...state,
        preferences: {
          ...state.preferences,
          indicators: action.payload,
          lastUpdated: new Date().toISOString(),
        },
      };
    case "ADD_FAVORITE_PAIR":
      if (
        !state.preferences ||
        state.preferences.favoritePairs.includes(action.payload)
      ) {
        return state;
      }
      return {
        ...state,
        preferences: {
          ...state.preferences,
          favoritePairs: [...state.preferences.favoritePairs, action.payload],
          lastUpdated: new Date().toISOString(),
        },
      };
    case "REMOVE_FAVORITE_PAIR":
      if (!state.preferences) return state;
      return {
        ...state,
        preferences: {
          ...state.preferences,
          favoritePairs: state.preferences.favoritePairs.filter(
            (pair) => pair !== action.payload,
          ),
          lastUpdated: new Date().toISOString(),
        },
      };
    case "UPDATE_UI_PREFERENCES":
      if (!state.preferences) return state;
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ui: action.payload,
          lastUpdated: new Date().toISOString(),
        },
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
}

// Create context
const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);

// Provider props
interface PreferencesProviderProps {
  children: ReactNode;
  userId?: string;
}

// Provider component
export function PreferencesProvider({
  children,
  userId = "guest",
}: PreferencesProviderProps) {
  const [state, dispatch] = useReducer(preferencesReducer, initialState);

  // Actions
  const loadPreferences = async (userId: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const preferences = await preferencesService.getUserPreferences(userId);
      dispatch({ type: "SET_PREFERENCES", payload: preferences });
    } catch (error) {
      console.warn("Failed to load preferences, using fallback:", error);
      // If all else fails, use hardcoded defaults directly
      const fallbackPreferences = {
        userId: userId || "guest",
        chart: {
          type: "line" as const,
          timeFrame: "1h",
          showVolume: true,
          showGrid: true,
          colorScheme: "default",
        },
        indicators: [],
        favoritePairs: ["BTC-USD", "ETH-USD", "ADA-USD", "SOL-USD"],
        ui: {
          darkMode: false,
          language: "en",
          showAdvancedFeatures: true, // Enable Elliott Wave features by default
          refreshInterval: 5000,
        },
        lastUpdated: new Date().toISOString(),
      };
      dispatch({ type: "SET_PREFERENCES", payload: fallbackPreferences });
      // Don't set error state - we successfully loaded fallback preferences
    }
  };

  const savePreferences = async (preferences: Partial<UserPreferences>) => {
    if (!state.preferences) return;

    try {
      const updated = await preferencesService.saveUserPreferences(
        state.preferences.userId,
        preferences,
      );
      dispatch({ type: "SET_PREFERENCES", payload: updated });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save preferences";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  };

  const updateChartPreferences = async (chartPreferences: ChartPreferences) => {
    dispatch({ type: "UPDATE_CHART_PREFERENCES", payload: chartPreferences });
    await savePreferences({ chart: chartPreferences });
  };

  const updateIndicators = async (indicators: IndicatorPreference[]) => {
    dispatch({ type: "UPDATE_INDICATORS", payload: indicators });
    await savePreferences({ indicators });
  };

  const addFavoritePair = async (pair: string) => {
    dispatch({ type: "ADD_FAVORITE_PAIR", payload: pair });
    if (state.preferences) {
      const newFavorites = [...state.preferences.favoritePairs, pair];
      await savePreferences({ favoritePairs: newFavorites });
    }
  };

  const removeFavoritePair = async (pair: string) => {
    dispatch({ type: "REMOVE_FAVORITE_PAIR", payload: pair });
    if (state.preferences) {
      const newFavorites = state.preferences.favoritePairs.filter(
        (p) => p !== pair,
      );
      await savePreferences({ favoritePairs: newFavorites });
    }
  };

  const updateUIPreferences = async (uiPreferences: UIPreferences) => {
    dispatch({ type: "UPDATE_UI_PREFERENCES", payload: uiPreferences });
    await savePreferences({ ui: uiPreferences });
  };

  const resetToDefaults = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const defaults = await preferencesService.getDefaultPreferences();
      dispatch({ type: "SET_PREFERENCES", payload: defaults });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reset preferences";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  };

  const actions = {
    loadPreferences,
    updateChartPreferences,
    updateIndicators,
    addFavoritePair,
    removeFavoritePair,
    updateUIPreferences,
    resetToDefaults,
  };

  // Load preferences on mount or when userId changes
  useEffect(() => {
    loadPreferences(userId);
  }, [userId]);

  return (
    <PreferencesContext.Provider value={{ state, actions }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// Hook for using preferences context
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}

// Export context for testing (keep at end to avoid fast refresh warning)
export { PreferencesContext };
