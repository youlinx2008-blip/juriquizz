
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"answers": {
                  Row: {
                    "attempt_id": string,"chosen_option": string,"is_correct": boolean,"position": number,"question_id": string
                  }
                  Insert: {
                    "attempt_id": string,"chosen_option": string,"is_correct": boolean,"position": number,"question_id": string
                  }
                  Update: {
                    "attempt_id"?: string,"chosen_option"?: string,"is_correct"?: boolean,"position"?: number,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "answers_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"attempts": {
                  Row: {
                    "chapter_id": string,"complete": boolean,"created_at": string,"id": string,"level": Database["public"]['Enums']["level"],"retry": boolean,"score": number,"total": number,"user_id": string
                  }
                  Insert: {
                    "chapter_id": string,"complete"?: boolean,"created_at"?: string,"id"?: string,"level": Database["public"]['Enums']["level"],"retry"?: boolean,"score": number,"total": number,"user_id": string
                  }
                  Update: {
                    "chapter_id"?: string,"complete"?: boolean,"created_at"?: string,"id"?: string,"level"?: Database["public"]['Enums']["level"],"retry"?: boolean,"score"?: number,"total"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempts_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "chapters"
      referencedColumns: ["id"]
    }
                  ]
                },"beta_codes": {
                  Row: {
                    "access_ends_at": string | null,"code": string,"created_at": string,"created_by": string | null,"disabled": boolean,"expires_at": string | null,"label": string,"uses": number,"uses_max": number
                  }
                  Insert: {
                    "access_ends_at"?: string | null,"code": string,"created_at"?: string,"created_by"?: string | null,"disabled"?: boolean,"expires_at"?: string | null,"label"?: string,"uses"?: number,"uses_max"?: number
                  }
                  Update: {
                    "access_ends_at"?: string | null,"code"?: string,"created_at"?: string,"created_by"?: string | null,"disabled"?: boolean,"expires_at"?: string | null,"label"?: string,"uses"?: number,"uses_max"?: number
                  }
                  Relationships: [
                    
                  ]
                },"chapters": {
                  Row: {
                    "created_at": string,"default_decor": Database["public"]['Enums']["decor"],"id": string,"label": string,"number": string,"position": number,"premium": boolean,"published_at": string | null,"slug": string,"subject_id": string,"summary": string,"title": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"default_decor": Database["public"]['Enums']["decor"],"id"?: string,"label": string,"number": string,"position": number,"premium"?: boolean,"published_at"?: string | null,"slug": string,"subject_id": string,"summary"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"default_decor"?: Database["public"]['Enums']["decor"],"id"?: string,"label"?: string,"number"?: string,"position"?: number,"premium"?: boolean,"published_at"?: string | null,"slug"?: string,"subject_id"?: string,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapters_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"course_documents": {
                  Row: {
                    "chapter_id": string,"file_size": number,"id": string,"page_count": number,"preview_pages": number,"storage_path": string,"title": string,"uploaded_at": string,"uploaded_by": string | null
                  }
                  Insert: {
                    "chapter_id": string,"file_size": number,"id"?: string,"page_count": number,"preview_pages"?: number,"storage_path": string,"title"?: string,"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "chapter_id"?: string,"file_size"?: number,"id"?: string,"page_count"?: number,"preview_pages"?: number,"storage_path"?: string,"title"?: string,"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "course_documents_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: true
      referencedRelation: "chapters"
      referencedColumns: ["id"]
    }
                  ]
                },"device_sessions": {
                  Row: {
                    "browser_key": string,"created_at": string,"id": string,"label": string,"last_seen_at": string,"revoked_at": string | null,"user_id": string
                  }
                  Insert: {
                    "browser_key": string,"created_at"?: string,"id"?: string,"label"?: string,"last_seen_at"?: string,"revoked_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "browser_key"?: string,"created_at"?: string,"id"?: string,"label"?: string,"last_seen_at"?: string,"revoked_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"entitlements": {
                  Row: {
                    "beta_code": string | null,"created_at": string,"ends_at": string | null,"id": string,"payment_id": string | null,"plan": Database["public"]['Enums']["plan"],"referral_payment_id": string | null,"source": string,"starts_at": string,"user_id": string
                  }
                  Insert: {
                    "beta_code"?: string | null,"created_at"?: string,"ends_at"?: string | null,"id"?: string,"payment_id"?: string | null,"plan": Database["public"]['Enums']["plan"],"referral_payment_id"?: string | null,"source": string,"starts_at"?: string,"user_id": string
                  }
                  Update: {
                    "beta_code"?: string | null,"created_at"?: string,"ends_at"?: string | null,"id"?: string,"payment_id"?: string | null,"plan"?: Database["public"]['Enums']["plan"],"referral_payment_id"?: string | null,"source"?: string,"starts_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "entitlements_beta_code_fkey"
      columns: ["beta_code"]
isOneToOne: false
      referencedRelation: "beta_codes"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "entitlements_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entitlements_referral_payment_id_fkey"
      columns: ["referral_payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"exam_attempts": {
                  Row: {
                    "answers": Json | null,"deadline": string,"exam_id": string,"id": string,"late": boolean | null,"question_ids": (string)[],"score": number | null,"started_at": string,"submitted_at": string | null,"total": number | null,"user_id": string
                  }
                  Insert: {
                    "answers"?: Json | null,"deadline": string,"exam_id": string,"id"?: string,"late"?: boolean | null,"question_ids": (string)[],"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null,"total"?: number | null,"user_id": string
                  }
                  Update: {
                    "answers"?: Json | null,"deadline"?: string,"exam_id"?: string,"id"?: string,"late"?: boolean | null,"question_ids"?: (string)[],"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null,"total"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exam_attempts_exam_id_fkey"
      columns: ["exam_id"]
isOneToOne: false
      referencedRelation: "mock_exams"
      referencedColumns: ["id"]
    }
                  ]
                },"exam_sessions": {
                  Row: {
                    "academic_year": string,"created_at": string,"ends_at": string,"id": string,"label": string
                  }
                  Insert: {
                    "academic_year": string,"created_at"?: string,"ends_at": string,"id"?: string,"label": string
                  }
                  Update: {
                    "academic_year"?: string,"created_at"?: string,"ends_at"?: string,"id"?: string,"label"?: string
                  }
                  Relationships: [
                    
                  ]
                },"feedback": {
                  Row: {
                    "comment": string,"created_at": string,"id": string,"question_id": string,"rating": Database["public"]['Enums']["feedback_rating"],"resolved_at": string | null,"user_id": string
                  }
                  Insert: {
                    "comment"?: string,"created_at"?: string,"id"?: string,"question_id": string,"rating": Database["public"]['Enums']["feedback_rating"],"resolved_at"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "comment"?: string,"created_at"?: string,"id"?: string,"question_id"?: string,"rating"?: Database["public"]['Enums']["feedback_rating"],"resolved_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"legal_page_versions": {
                  Row: {
                    "body": string,"created_at": string,"slug": string,"title": string,"version": number
                  }
                  Insert: {
                    "body": string,"created_at"?: string,"slug": string,"title": string,"version": number
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"slug"?: string,"title"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "legal_page_versions_slug_fkey"
      columns: ["slug"]
isOneToOne: false
      referencedRelation: "legal_pages"
      referencedColumns: ["slug"]
    }
                  ]
                },"legal_pages": {
                  Row: {
                    "body": string,"slug": string,"title": string,"updated_at": string,"updated_by": string | null,"version": number
                  }
                  Insert: {
                    "body": string,"slug": string,"title": string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "body"?: string,"slug"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"mock_exams": {
                  Row: {
                    "chapter_ids": (string)[],"created_at": string,"description": string,"duration_minutes": number,"id": string,"levels": (Database["public"]['Enums']["level"])[],"position": number,"premium": boolean,"published_at": string | null,"question_count": number,"slug": string,"subject_id": string,"title": string,"updated_at": string,"visible": boolean
                  }
                  Insert: {
                    "chapter_ids"?: (string)[],"created_at"?: string,"description"?: string,"duration_minutes": number,"id"?: string,"levels"?: (Database["public"]['Enums']["level"])[],"position"?: number,"premium"?: boolean,"published_at"?: string | null,"question_count": number,"slug": string,"subject_id": string,"title": string,"updated_at"?: string,"visible"?: boolean
                  }
                  Update: {
                    "chapter_ids"?: (string)[],"created_at"?: string,"description"?: string,"duration_minutes"?: number,"id"?: string,"levels"?: (Database["public"]['Enums']["level"])[],"position"?: number,"premium"?: boolean,"published_at"?: string | null,"question_count"?: number,"slug"?: string,"subject_id"?: string,"title"?: string,"updated_at"?: string,"visible"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "mock_exams_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"cgv_version": number,"created_at": string,"currency": string,"discount_cents": number,"discount_reason": string | null,"id": string,"paid_at": string | null,"plan": Database["public"]['Enums']["plan"],"quoted_ends_at": string,"referrer_id": string | null,"refunded_at": string | null,"status": string,"stripe_payment_intent": string | null,"stripe_session_id": string | null,"user_id": string | null,"withdrawal_waiver_at": string
                  }
                  Insert: {
                    "amount_cents": number,"cgv_version": number,"created_at"?: string,"currency"?: string,"discount_cents"?: number,"discount_reason"?: string | null,"id"?: string,"paid_at"?: string | null,"plan": Database["public"]['Enums']["plan"],"quoted_ends_at": string,"referrer_id"?: string | null,"refunded_at"?: string | null,"status"?: string,"stripe_payment_intent"?: string | null,"stripe_session_id"?: string | null,"user_id"?: string | null,"withdrawal_waiver_at": string
                  }
                  Update: {
                    "amount_cents"?: number,"cgv_version"?: number,"created_at"?: string,"currency"?: string,"discount_cents"?: number,"discount_reason"?: string | null,"id"?: string,"paid_at"?: string | null,"plan"?: Database["public"]['Enums']["plan"],"quoted_ends_at"?: string,"referrer_id"?: string | null,"refunded_at"?: string | null,"status"?: string,"stripe_payment_intent"?: string | null,"stripe_session_id"?: string | null,"user_id"?: string | null,"withdrawal_waiver_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pdf_views": {
                  Row: {
                    "document_id": string,"id": number,"user_id": string,"viewed_at": string
                  }
                  Insert: {
                    "document_id": string,"id"?: never,"user_id": string,"viewed_at"?: string
                  }
                  Update: {
                    "document_id"?: string,"id"?: never,"user_id"?: string,"viewed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pdf_views_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "course_documents"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "description": string,"duration": string,"duration_days": number | null,"id": Database["public"]['Enums']["plan"],"label": string,"on_sale": boolean,"position": number,"price_cents": number,"promo_price_cents": number | null,"promo_until": string | null,"updated_at": string
                  }
                  Insert: {
                    "description"?: string,"duration": string,"duration_days"?: number | null,"id": Database["public"]['Enums']["plan"],"label": string,"on_sale"?: boolean,"position"?: number,"price_cents": number,"promo_price_cents"?: number | null,"promo_until"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "description"?: string,"duration"?: string,"duration_days"?: number | null,"id"?: Database["public"]['Enums']["plan"],"label"?: string,"on_sale"?: boolean,"position"?: number,"price_cents"?: number,"promo_price_cents"?: number | null,"promo_until"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"decor_pref": string | null,"display_name": string,"full_name": string | null,"id": string,"referred_at": string | null,"referred_by": string | null,"sound_pref": string | null,"terms_accepted_at": string | null,"terms_version": number | null,"theme_pref": string | null,"updated_at": string,"volume": number | null
                  }
                  Insert: {
                    "created_at"?: string,"decor_pref"?: string | null,"display_name"?: string,"full_name"?: string | null,"id": string,"referred_at"?: string | null,"referred_by"?: string | null,"sound_pref"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: number | null,"theme_pref"?: string | null,"updated_at"?: string,"volume"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"decor_pref"?: string | null,"display_name"?: string,"full_name"?: string | null,"id"?: string,"referred_at"?: string | null,"referred_by"?: string | null,"sound_pref"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: number | null,"theme_pref"?: string | null,"updated_at"?: string,"volume"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"questions": {
                  Row: {
                    "chapter_id": string,"content_hash": string,"correct_option": string,"course_order": number,"created_at": string,"decor": Database["public"]['Enums']["decor"] | null,"demo": boolean,"explanation": NonNullable<Json>,"hint": string | null,"id": string,"level": Database["public"]['Enums']["level"],"options": NonNullable<Json>,"position": number,"prompt": string,"retired_at": string | null,"review_status": Database["public"]['Enums']["review_status"],"reviewed_at": string | null,"reviewed_by": string | null,"type": Database["public"]['Enums']["question_type"],"updated_at": string
                  }
                  Insert: {
                    "chapter_id": string,"content_hash": string,"correct_option": string,"course_order": number,"created_at"?: string,"decor"?: Database["public"]['Enums']["decor"] | null,"demo"?: boolean,"explanation": NonNullable<Json>,"hint"?: string | null,"id": string,"level": Database["public"]['Enums']["level"],"options": NonNullable<Json>,"position": number,"prompt": string,"retired_at"?: string | null,"review_status"?: Database["public"]['Enums']["review_status"],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"type": Database["public"]['Enums']["question_type"],"updated_at"?: string
                  }
                  Update: {
                    "chapter_id"?: string,"content_hash"?: string,"correct_option"?: string,"course_order"?: number,"created_at"?: string,"decor"?: Database["public"]['Enums']["decor"] | null,"demo"?: boolean,"explanation"?: NonNullable<Json>,"hint"?: string | null,"id"?: string,"level"?: Database["public"]['Enums']["level"],"options"?: NonNullable<Json>,"position"?: number,"prompt"?: string,"retired_at"?: string | null,"review_status"?: Database["public"]['Enums']["review_status"],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"type"?: Database["public"]['Enums']["question_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "chapters"
      referencedColumns: ["id"]
    }
                  ]
                },"referral_codes": {
                  Row: {
                    "code": string,"created_at": string,"user_id": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "beta_ends_at": string | null,"id": boolean,"levels_unlock": boolean,"referral_bonus_days": number,"referral_discount_cents": number,"referral_enabled": boolean,"referral_max_per_year": number,"updated_at": string
                  }
                  Insert: {
                    "beta_ends_at"?: string | null,"id"?: boolean,"levels_unlock"?: boolean,"referral_bonus_days"?: number,"referral_discount_cents"?: number,"referral_enabled"?: boolean,"referral_max_per_year"?: number,"updated_at"?: string
                  }
                  Update: {
                    "beta_ends_at"?: string | null,"id"?: boolean,"levels_unlock"?: boolean,"referral_bonus_days"?: number,"referral_discount_cents"?: number,"referral_enabled"?: boolean,"referral_max_per_year"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subjects": {
                  Row: {
                    "created_at": string,"id": string,"position": number,"slug": string,"title": string,"updated_at": string,"visible": boolean
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"position"?: number,"slug": string,"title": string,"updated_at"?: string,"visible"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"position"?: number,"slug"?: string,"title"?: string,"updated_at"?: string,"visible"?: boolean
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_terms":
{ Args: { "p_version": number }; Returns: undefined
                           },
"access_chain_end":
{ Args: { "p_user": string }; Returns: string
                           },
"admin_create_beta_codes":
{ Args: { "p_access_ends_at"?: string,"p_code"?: string,"p_count": number,"p_expires_at"?: string,"p_label"?: string,"p_prefix"?: string,"p_uses_max": number }; Returns: {
              "access_ends_at": string | null,
"code": string,
"created_at": string,
"created_by": string | null,
"disabled": boolean,
"expires_at": string | null,
"label": string,
"uses": number,
"uses_max": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "beta_codes"
        isOneToOne: false
        isSetofReturn: true
      } },
"admin_option_stats":
{ Args: { "p_question_id": string }; Returns: {
              "chosen_count": number,"option_id": string
            }[]
                           },
"admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_payments":
{ Args: { "p_limit"?: number }; Returns: {
              "amount_cents": number,"created_at": string,"discount_cents": number,"discount_reason": string,"email": string,"ends_at": string,"paid_at": string,"payment_id": string,"plan": Database["public"]['Enums']["plan"],"refunded_at": string,"status": string,"stripe_payment_intent": string
            }[]
                           },
"admin_question_stats":
{ Args: { "p_subject_id"?: string }; Returns: {
              "answers_count": number,"chapter_id": string,"chapter_label": string,"chapter_position": number,"correct_count": number,"demo": boolean,"feedback_claire": number,"feedback_erreur": number,"feedback_open": number,"feedback_pas_claire": number,"level": Database["public"]['Enums']["level"],"prompt": string,"question_id": string,"question_position": number,"retired": boolean,"review_status": Database["public"]['Enums']["review_status"],"subject_id": string,"type": Database["public"]['Enums']["question_type"],"users_count": number
            }[]
                           },
"admin_resolve_feedback":
{ Args: { "p_feedback_id": string,"p_resolved": boolean }; Returns: undefined
                           },
"admin_set_beta_code_disabled":
{ Args: { "p_code": string,"p_disabled": boolean }; Returns: undefined
                           },
"admin_set_beta_end":
{ Args: { "p_ends_at": string }; Returns: number
                           },
"admin_set_chapter_premium":
{ Args: { "p_chapter_id": string,"p_premium": boolean }; Returns: undefined
                           },
"admin_set_question_demo":
{ Args: { "p_demo": boolean,"p_question_id": string }; Returns: undefined
                           },
"admin_set_review_status":
{ Args: { "p_question_id": string,"p_status": Database["public"]['Enums']["review_status"] }; Returns: undefined
                           },
"admin_set_subject_visibility":
{ Args: { "p_subject_id": string,"p_visible": boolean }; Returns: undefined
                           },
"admin_update_legal_page":
{ Args: { "p_body": string,"p_slug": string,"p_title": string }; Returns: number
                           },
"assert_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"attach_checkout_session":
{ Args: { "p_payment_id": string,"p_session_id": string }; Returns: undefined
                           },
"authorize_pdf_view":
{ Args: { "p_document_id": string }; Returns: Json
                           },
"beta_access_end":
{ Args: { "p_code_end": string }; Returns: string
                           },
"can_see_demo_question":
{ Args: { "p_chapter_id": string,"p_retired_at": string,"p_status": Database["public"]['Enums']["review_status"] }; Returns: boolean
                           },
"can_see_question":
{ Args: { "p_chapter_id": string,"p_retired_at": string,"p_status": Database["public"]['Enums']["review_status"] }; Returns: boolean
                           },
"chapter_news":
{ Args: Record<PropertyKey, never>; Returns: {
              "available_at": string,"chapter_id": string
            }[]
                           },
"check_beta_code":
{ Args: { "p_code": string }; Returns: string
                           },
"check_device":
{ Args: { "p_key": string }; Returns: string
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"exam_question_pool":
{ Args: { "p_exam_id": string }; Returns: {
              "question_id": string
            }[]
                           },
"exam_relue_pool_size":
{ Args: { "p_exam_id": string }; Returns: number
                           },
"expire_checkout":
{ Args: { "p_session_id": string }; Returns: undefined
                           },
"fulfill_payment":
{ Args: { "p_amount": number,"p_currency": string,"p_payment_id": string,"p_payment_intent": string,"p_session_id": string }; Returns: Json
                           },
"grant_beta_from_code":
{ Args: { "p_code": string,"p_user": string }; Returns: string
                           },
"grant_referral_reward":
{ Args: { "p_payment_id": string }; Returns: string
                           },
"has_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"has_beta_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"has_premium":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"import_subject":
{ Args: { "p_payload": Json,"p_publish"?: boolean }; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"legal_ready":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"level_unlocked":
{ Args: { "p_chapter_id": string,"p_level": Database["public"]['Enums']["level"] }; Returns: boolean
                           },
"my_level_access":
{ Args: { "p_chapter_id": string }; Returns: {
              "level": Database["public"]['Enums']["level"],"unlocked": boolean
            }[]
                           },
"my_question_status":
{ Args: { "p_chapter_id"?: string }; Returns: {
              "answered": number,"chapter_id": string,"last_answered_at": string,"last_correct": boolean,"level": Database["public"]['Enums']["level"],"question_id": string
            }[]
                           },
"my_referral_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_referrals":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"normalize_code":
{ Args: { "p_code": string }; Returns: string
                           },
"pass_end":
{ Args: { "p_from": string,"p_plan": Database["public"]['Enums']["plan"] }; Returns: string
                           },
"pass_offers":
{ Args: Record<PropertyKey, never>; Returns: {
              "available": boolean,"description": string,"duration": string,"duration_days": number,"ends_at": string,"label": string,"plan": Database["public"]['Enums']["plan"],"price_cents": number,"promo_until": string,"regular_price_cents": number
            }[]
                           },
"premium_exclusives":
{ Args: Record<PropertyKey, never>; Returns: {
              "item_id": string,"kind": string,"subject_title": string,"title": string
            }[]
                           },
"quote_pass":
{ Args: { "p_plan": Database["public"]['Enums']["plan"] }; Returns: Json
                           },
"random_beta_code":
{ Args: { "p_prefix": string }; Returns: string
                           },
"redeem_beta_code":
{ Args: { "p_code": string }; Returns: string
                           },
"referral_invitation":
{ Args: { "p_code": string }; Returns: Json
                           },
"refund_payment":
{ Args: { "p_payment_intent": string }; Returns: Json
                           },
"register_device":
{ Args: { "p_key": string,"p_label": string }; Returns: string
                           },
"revoke_device":
{ Args: { "p_device": string }; Returns: undefined
                           },
"start_checkout":
{ Args: { "p_accept_cgv": boolean,"p_plan": Database["public"]['Enums']["plan"],"p_waive_withdrawal": boolean }; Returns: Json
                           },
"start_mock_exam":
{ Args: { "p_exam_id": string }; Returns: Json
                           },
"submit_attempt":
{ Args: { "p_answers": Json,"p_chapter_id": string,"p_level": Database["public"]['Enums']["level"],"p_retry": boolean }; Returns: Json
                           },
"submit_mock_exam":
{ Args: { "p_answers": Json,"p_attempt_id": string }; Returns: Json
                           },
"viewer_context":
{ Args: Record<PropertyKey, never>; Returns: Json
                           }
          }
          Enums: {
            "decor": "ruines"|"frontiere"|"codex"|"eglise"|"plaine"|"mer"|"chateau","feedback_rating": "claire"|"pas_claire"|"erreur","level": "facile"|"intermediaire"|"confirme","plan": "beta"|"pass_mensuel"|"pass_partiels"|"pass_annee"|"pass_annee_premium"|"parrainage","question_type": "qcm"|"vrai_faux"|"cas_pratique","review_status": "a_relire"|"relue"|"a_corriger"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "decor": ["ruines", "frontiere", "codex", "eglise", "plaine", "mer", "chateau"],"feedback_rating": ["claire", "pas_claire", "erreur"],"level": ["facile", "intermediaire", "confirme"],"plan": ["beta", "pass_mensuel", "pass_partiels", "pass_annee", "pass_annee_premium", "parrainage"],"question_type": ["qcm", "vrai_faux", "cas_pratique"],"review_status": ["a_relire", "relue", "a_corriger"]
          }
        }
} as const
