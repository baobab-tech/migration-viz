export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      m49_regions: {
        Row: {
          country_name: string | null
          intermediate_region_code: number | null
          intermediate_region_name: string | null
          iso2_code: string
          region_code: number | null
          region_name: string | null
          subregion_code: number | null
          subregion_name: string | null
        }
        Insert: {
          country_name?: string | null
          intermediate_region_code?: number | null
          intermediate_region_name?: string | null
          iso2_code: string
          region_code?: number | null
          region_name?: string | null
          subregion_code?: number | null
          subregion_name?: string | null
        }
        Update: {
          country_name?: string | null
          intermediate_region_code?: number | null
          intermediate_region_name?: string | null
          iso2_code?: string
          region_code?: number | null
          region_name?: string | null
          subregion_code?: number | null
          subregion_name?: string | null
        }
        Relationships: []
      }
      migration_flows: {
        Row: {
          country_from: string | null
          country_to: string | null
          created_at: string | null
          id: number
          migration_month: string | null
          num_migrants: number | null
        }
        Insert: {
          country_from?: string | null
          country_to?: string | null
          created_at?: string | null
          id?: number
          migration_month?: string | null
          num_migrants?: number | null
        }
        Update: {
          country_from?: string | null
          country_to?: string | null
          created_at?: string | null
          id?: number
          migration_month?: string | null
          num_migrants?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      country_migration_summary: {
        Row: {
          country: string | null
          destination_count: number | null
          net_migration: number | null
          origin_count: number | null
          total_inbound: number | null
          total_outbound: number | null
          year: number | null
        }
        Relationships: []
      }
      flows_corridor_rankings_annual: {
        Row: {
          country_from: string | null
          country_to: string | null
          num_migrants: number | null
          percentile: number | null
          rank: number | null
          year: number | null
        }
        Relationships: []
      }
      flows_country_to_country_annual: {
        Row: {
          country_from: string | null
          country_to: string | null
          num_migrants: number | null
          year: number | null
        }
        Relationships: []
      }
      flows_country_to_country_monthly: {
        Row: {
          country_from: string | null
          country_to: string | null
          intermediate_from: string | null
          intermediate_to: string | null
          migration_month: string | null
          month: number | null
          num_migrants: number | null
          period: string | null
          quarter: number | null
          region_from: string | null
          region_to: string | null
          season: string | null
          subregion_from: string | null
          subregion_to: string | null
          year: number | null
        }
        Relationships: []
      }
      flows_country_to_country_quarterly: {
        Row: {
          country_from: string | null
          country_to: string | null
          num_migrants: number | null
          quarter: number | null
          quarter_year: string | null
          year: number | null
        }
        Relationships: []
      }
      flows_country_to_region_monthly: {
        Row: {
          country_from: string | null
          migration_month: string | null
          num_migrants: number | null
          region_to: string | null
        }
        Relationships: []
      }
      flows_gross_annual_country: {
        Row: {
          country_from: string | null
          country_to: string | null
          gross_flow: number | null
          year: number | null
        }
        Relationships: []
      }
      flows_growth_rates_annual: {
        Row: {
          country_from: string | null
          country_to: string | null
          growth_rate: number | null
          growth_velocity: number | null
          num_migrants: number | null
          year: number | null
        }
        Relationships: []
      }
      flows_intermediate_to_intermediate_monthly: {
        Row: {
          intermediate_from: string | null
          intermediate_to: string | null
          migration_month: string | null
          num_migrants: number | null
        }
        Relationships: []
      }
      flows_net_annual_country: {
        Row: {
          country_from: string | null
          country_to: string | null
          gross_flow: number | null
          net_flow: number | null
          year: number | null
        }
        Relationships: []
      }
      flows_pandemic_comparison_country: {
        Row: {
          change_absolute: number | null
          change_percent: number | null
          country_from: string | null
          country_to: string | null
          pandemic: number | null
          pre_pandemic: number | null
        }
        Relationships: []
      }
      flows_region_to_country_monthly: {
        Row: {
          country_to: string | null
          migration_month: string | null
          num_migrants: number | null
          region_from: string | null
        }
        Relationships: []
      }
      flows_region_to_region_annual: {
        Row: {
          num_migrants: number | null
          region_from: string | null
          region_to: string | null
          year: number | null
        }
        Relationships: []
      }
      flows_region_to_region_monthly: {
        Row: {
          migration_month: string | null
          num_migrants: number | null
          region_from: string | null
          region_to: string | null
        }
        Relationships: []
      }
      flows_rolling_averages_top100: {
        Row: {
          country_from: string | null
          country_to: string | null
          migration_month: string | null
          num_migrants: number | null
          rolling_3m: number | null
          rolling_6m: number | null
          trend_slope: number | null
        }
        Relationships: []
      }
      flows_seasonal_patterns_country: {
        Row: {
          country_from: string | null
          country_to: string | null
          q1: number | null
          q2: number | null
          q3: number | null
          q4: number | null
        }
        Relationships: []
      }
      flows_subregion_to_subregion_monthly: {
        Row: {
          migration_month: string | null
          num_migrants: number | null
          subregion_from: string | null
          subregion_to: string | null
        }
        Relationships: []
      }
      top_migration_corridors: {
        Row: {
          country_from: string | null
          country_to: string | null
          period: string | null
          rank: number | null
          total_migrants: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_migration_tables: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_public_read_access: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_corridor_time_series: {
        Args: {
          p_corridors?: string[]
          p_countries?: string[]
          p_end_date?: string
          p_excluded_countries?: string[]
          p_excluded_regions?: string[]
          p_max_flow?: number
          p_min_flow?: number
          p_period?: string
          p_regions?: string[]
          p_start_date?: string
        }
        Returns: {
          corridor: string
          country_from: string
          country_to: string
          migrants: number
          month: string
        }[]
      }
      get_dashboard_summary: {
        Args: {
          p_countries?: string[]
          p_end_date?: string
          p_excluded_countries?: string[]
          p_excluded_regions?: string[]
          p_max_flow?: number
          p_min_flow?: number
          p_period?: string
          p_regions?: string[]
          p_start_date?: string
        }
        Returns: {
          active_months: number
          avg_monthly_flow: number
          total_flows: number
          unique_corridors: number
        }[]
      }
      get_filtered_top_corridors: {
        Args: {
          p_countries?: string[]
          p_end_date?: string
          p_excluded_countries?: string[]
          p_excluded_regions?: string[]
          p_limit?: number
          p_max_flow?: number
          p_min_flow?: number
          p_period?: string
          p_regions?: string[]
          p_start_date?: string
        }
        Returns: {
          corridor: string
          country_from: string
          country_to: string
          total_migrants: number
        }[]
      }
      get_monthly_migration_totals: {
        Args: {
          p_countries?: string[]
          p_end_date?: string
          p_excluded_countries?: string[]
          p_excluded_regions?: string[]
          p_max_flow?: number
          p_min_flow?: number
          p_period?: string
          p_regions?: string[]
          p_start_date?: string
        }
        Returns: {
          month: string
          total_migrants: number
        }[]
      }
      refresh_migration_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
