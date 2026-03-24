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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chamado_historico: {
        Row: {
          acao: string
          chamado_id: number
          created_at: string
          descricao: string | null
          descricao_ticket: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          chamado_id: number
          created_at?: string
          descricao?: string | null
          descricao_ticket?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          chamado_id?: number
          created_at?: string
          descricao?: string | null
          descricao_ticket?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamado_historico_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamado_historico_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_historico_excluido: {
        Row: {
          acao: string
          chamado_excluido_id: string
          chamado_id_original: number
          created_at: string
          descricao: string | null
          descricao_ticket: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          chamado_excluido_id: string
          chamado_id_original: number
          created_at: string
          descricao?: string | null
          descricao_ticket?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          chamado_excluido_id?: string
          chamado_id_original?: number
          created_at?: string
          descricao?: string | null
          descricao_ticket?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamado_historico_excluido_chamado_excluido_id_fkey"
            columns: ["chamado_excluido_id"]
            isOneToOne: false
            referencedRelation: "chamados_excluidos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_entrada_excluida: {
        Row: {
          id: string
          chamado_id: number
          historico_entrada_id: string
          entrada: Json
          chamado_snapshot: Json
          etapa_entrada_label: string | null
          etapa_entrada_key: string | null
          status_entrada_label: string | null
          status_entrada_key: string | null
          motivo_exclusao: string
          deleted_at: string
          deleted_by: string | null
        }
        Insert: {
          id?: string
          chamado_id: number
          historico_entrada_id: string
          entrada: Json
          chamado_snapshot: Json
          etapa_entrada_label?: string | null
          etapa_entrada_key?: string | null
          status_entrada_label?: string | null
          status_entrada_key?: string | null
          motivo_exclusao: string
          deleted_at?: string
          deleted_by?: string | null
        }
        Update: {
          id?: string
          chamado_id?: number
          historico_entrada_id?: string
          entrada?: Json
          chamado_snapshot?: Json
          etapa_entrada_label?: string | null
          etapa_entrada_key?: string | null
          status_entrada_label?: string | null
          status_entrada_key?: string | null
          motivo_exclusao?: string
          deleted_at?: string
          deleted_by?: string | null
        }
        Relationships: []
      }
      chamados: {
        Row: {
          atualizado_por: string | null
          cliente_id: string | null
          cliente_nome: string
          created_at: string
          data_contato: string | null
          data_retorno: string | null
          descricao: string | null
          etapa: string | null
          gestor_id: string | null
          id: number
          metros_totais: string | null
          motivo: string
          negociado_com: string | null
          nfe: string | null
          prioridade: Database["public"]["Enums"]["ticket_prioridade"]
          representante_id: string | null
          sdp_data: Json | null
          status: Database["public"]["Enums"]["ticket_status"]
          status_agendamento: string | null
          submotivo: string | null
          supervisor_id: string | null
          tipo_solicitacao: string | null
          updated_at: string
        }
        Insert: {
          atualizado_por?: string | null
          cliente_id?: string | null
          cliente_nome: string
          created_at?: string
          data_contato?: string | null
          data_retorno?: string | null
          descricao?: string | null
          etapa?: string | null
          gestor_id?: string | null
          id?: never
          metros_totais?: string | null
          motivo: string
          negociado_com?: string | null
          nfe?: string | null
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          representante_id?: string | null
          sdp_data?: Json | null
          status?: Database["public"]["Enums"]["ticket_status"]
          status_agendamento?: string | null
          submotivo?: string | null
          supervisor_id?: string | null
          tipo_solicitacao?: string | null
          updated_at?: string
        }
        Update: {
          atualizado_por?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          created_at?: string
          data_contato?: string | null
          data_retorno?: string | null
          descricao?: string | null
          etapa?: string | null
          gestor_id?: string | null
          id?: never
          metros_totais?: string | null
          motivo?: string
          negociado_com?: string | null
          nfe?: string | null
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          representante_id?: string | null
          sdp_data?: Json | null
          status?: Database["public"]["Enums"]["ticket_status"]
          status_agendamento?: string | null
          submotivo?: string | null
          supervisor_id?: string | null
          tipo_solicitacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_excluidos: {
        Row: {
          dados: Json
          deleted_at: string
          deleted_by: string | null
          id: string
          id_original: number
          motivo_exclusao: string | null
        }
        Insert: {
          dados: Json
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          id_original: number
          motivo_exclusao?: string | null
        }
        Update: {
          dados?: Json
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          id_original?: number
          motivo_exclusao?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          codigo: number | null
          created_at: string
          id: string
          nome: string
          rede_id: string | null
          representante_id: string | null
        }
        Insert: {
          codigo?: number | null
          created_at?: string
          id?: string
          nome: string
          rede_id?: string | null
          representante_id?: string | null
        }
        Update: {
          codigo?: number | null
          created_at?: string
          id?: string
          nome?: string
          rede_id?: string | null
          representante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_rede_id_fkey"
            columns: ["rede_id"]
            isOneToOne: false
            referencedRelation: "redes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          cor: string
          created_at: string
          id: string
          label: string
          nome: string
          ordem: number
        }
        Insert: {
          cor: string
          created_at?: string
          id?: string
          label: string
          nome: string
          ordem?: number
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          label?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      motivos: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          cod_produto: string
          created_at: string
          id: string
          produto: string
        }
        Insert: {
          cod_produto: string
          created_at?: string
          id?: string
          produto: string
        }
        Update: {
          cod_produto?: string
          created_at?: string
          id?: string
          produto?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          status: string
          supervisora: string | null
          telefone: string | null
          updated_at: string
          user_id: string
          usuario: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          status?: string
          supervisora?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
          usuario?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          supervisora?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
          usuario?: string | null
        }
        Relationships: []
      }
      redes: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      representantes: {
        Row: {
          codigo: number
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          codigo: number
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          codigo?: number
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      submotivos: {
        Row: {
          created_at: string
          id: string
          motivo_id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo_id: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo_id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "submotivos_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "motivos"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_representante: {
        Row: {
          id: string
          representante_id: string
          supervisor_id: string
        }
        Insert: {
          id?: string
          representante_id: string
          supervisor_id: string
        }
        Update: {
          id?: string
          representante_id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_representante_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_representante_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "supervisores"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisores: {
        Row: {
          created_at: string
          id: string
          nome: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: { Args: { _username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "supervisor" | "representante"
      ticket_prioridade: "Alta" | "Média" | "Baixa"
      ticket_status: "aberto" | "em_progresso" | "fechado" | "pendente"
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
    Enums: {
      app_role: ["admin", "gestor", "supervisor", "representante"],
      ticket_prioridade: ["Alta", "Média", "Baixa"],
      ticket_status: ["aberto", "em_progresso", "fechado", "pendente"],
    },
  },
} as const
