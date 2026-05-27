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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      employee_attendance: {
        Row: {
          created_at: string
          date: string
          deduction: number
          employee_id: string
          id: string
          reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date?: string
          deduction?: number
          employee_id: string
          id?: string
          reason?: string | null
          status: string
        }
        Update: {
          created_at?: string
          date?: string
          deduction?: number
          employee_id?: string
          id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_consumption: {
        Row: {
          amount: number
          concept: string
          created_at: string
          date: string
          employee_id: string
          id: string
          paid: boolean
        }
        Insert: {
          amount?: number
          concept: string
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          paid?: boolean
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          paid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "employee_consumption_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_payroll: {
        Row: {
          base_amount: number
          consumption: number
          deductions: number
          employee_id: string
          id: string
          kind: string
          net_paid: number
          notes: string | null
          paid_at: string
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          base_amount?: number
          consumption?: number
          deductions?: number
          employee_id: string
          id?: string
          kind: string
          net_paid?: number
          notes?: string | null
          paid_at?: string
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          base_amount?: number
          consumption?: number
          deductions?: number
          employee_id?: string
          id?: string
          kind?: string
          net_paid?: number
          notes?: string | null
          paid_at?: string
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          day_off: string | null
          hired_at: string | null
          id: string
          name: string
          role: string | null
          weekly_salary: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_off?: string | null
          hired_at?: string | null
          id?: string
          name: string
          role?: string | null
          weekly_salary?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          day_off?: string | null
          hired_at?: string | null
          id?: string
          name?: string
          role?: string | null
          weekly_salary?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          concept: string
          created_at: string
          date: string
          id: string
        }
        Insert: {
          amount?: number
          concept: string
          created_at?: string
          date?: string
          id?: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string
          date?: string
          id?: string
        }
        Relationships: []
      }
      extras: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      order_item_extras: {
        Row: {
          created_at: string
          extra_id: string | null
          id: string
          name_snapshot: string
          order_item_id: string
          price_snapshot: number
          quantity: number
        }
        Insert: {
          created_at?: string
          extra_id?: string | null
          id?: string
          name_snapshot: string
          order_item_id: string
          price_snapshot: number
          quantity?: number
        }
        Update: {
          created_at?: string
          extra_id?: string | null
          id?: string
          name_snapshot?: string
          order_item_id?: string
          price_snapshot?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_extras_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          name_snapshot: string
          notes: string | null
          order_id: string
          price_snapshot: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          name_snapshot: string
          notes?: string | null
          order_id: string
          price_snapshot: number
          product_id?: string | null
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          name_snapshot?: string
          notes?: string | null
          order_id?: string
          price_snapshot?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_received: number | null
          closed_at: string | null
          customer_name: string | null
          delivery_provider: string | null
          guests: number
          id: string
          opened_at: string
          payment_method: string | null
          queue_number: number | null
          status: string
          subtotal: number
          table_id: string | null
          total: number
          type: string
        }
        Insert: {
          amount_received?: number | null
          closed_at?: string | null
          customer_name?: string | null
          delivery_provider?: string | null
          guests?: number
          id?: string
          opened_at?: string
          payment_method?: string | null
          queue_number?: number | null
          status?: string
          subtotal?: number
          table_id?: string | null
          total?: number
          type?: string
        }
        Update: {
          amount_received?: number | null
          closed_at?: string | null
          customer_name?: string | null
          delivery_provider?: string | null
          guests?: number
          id?: string
          opened_at?: string
          payment_method?: string | null
          queue_number?: number | null
          status?: string
          subtotal?: number
          table_id?: string | null
          total?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          category_id: string | null
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          address: string | null
          delivery_providers: string[]
          id: string
          name: string
          phone: string | null
          ruc: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          delivery_providers?: string[]
          id?: string
          name?: string
          phone?: string | null
          ruc?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          delivery_providers?: string[]
          id?: string
          name?: string
          phone?: string | null
          ruc?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          guests: number
          id: string
          number: number
          opened_at: string | null
          status: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          guests?: number
          id?: string
          number: number
          opened_at?: string | null
          status?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          guests?: number
          id?: string
          number?: number
          opened_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recompute_order_total: { Args: { p_order: string }; Returns: undefined }
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
