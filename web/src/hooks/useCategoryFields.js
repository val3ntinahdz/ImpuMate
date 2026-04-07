// Returns the list of additional fields to render for each expense category.
// Common fields (amountMXN, hasCFDI, invoiceReceiverRFCMatchesTaxpayer,
// paymentMethod, paidFromTaxpayerAccount, paidInRelevantFiscalYear) are always present.

export default function useCategoryFields(category) {
  if (!category) return []

  const isPersonal = category.startsWith('PERSONAL_')
  const isBusiness = category.startsWith('BUSINESS_')
  const isArr = category.startsWith('ARR_')

  const fields = []

  // Beneficiary — all personal categories
  if (isPersonal) {
    fields.push({ name: 'beneficiaryRelationship', type: 'select', label: 'Beneficiario', required: true,
      options: [
        { value: 'SELF', label: 'Yo mismo' },
        { value: 'SPOUSE', label: 'Cónyuge o concubino/a' },
        { value: 'CHILD', label: 'Hijo/a' },
        { value: 'PARENT', label: 'Madre o padre' },
        { value: 'GRANDPARENT', label: 'Abuelo/a' },
        { value: 'GRANDCHILD', label: 'Nieto/a' },
      ],
    })
  }

  // Category-specific fields
  switch (category) {
    case 'PERSONAL_MEDICAL':
    case 'PERSONAL_MEDICAL_INSURANCE':
      fields.push({ name: 'providerHasRequiredProfessionalLicense', type: 'toggle', label: '¿El prestador tiene título profesional registrado?', required: true })
      break

    case 'PERSONAL_MEDICAL_DISABILITY':
      fields.push({ name: 'disabilityCertificate', type: 'toggle', label: '¿Tienes certificado de discapacidad?', required: true })
      fields.push({ name: 'disabilityPercentage', type: 'number', label: 'Porcentaje de discapacidad (%)', hint: 'Debe ser ≥ 50%', required: true })
      break

    case 'PERSONAL_TUITION':
      fields.push({ name: 'schoolLevel', type: 'select', label: 'Nivel educativo', required: true,
        options: [
          { value: 'PREESCOLAR', label: 'Preescolar' },
          { value: 'PRIMARIA', label: 'Primaria' },
          { value: 'SECUNDARIA', label: 'Secundaria' },
          { value: 'PROFESIONAL_TECNICO', label: 'Profesional Técnico' },
          { value: 'BACHILLERATO', label: 'Bachillerato' },
        ],
      })
      fields.push({ name: 'hasOfficialSchoolRecognition', type: 'toggle', label: '¿La escuela tiene reconocimiento oficial (RVOE)?', required: true })
      break

    case 'PERSONAL_SCHOOL_TRANSPORT':
      fields.push({ name: 'schoolTransportMandatory', type: 'toggle', label: '¿El transporte escolar es obligatorio?', required: true })
      fields.push({ name: 'invoiceSeparatesTransport', type: 'toggle', label: '¿La factura separa el transporte de la colegiatura?', required: true })
      break

    case 'PERSONAL_DONATION':
      fields.push({ name: 'donationRecipientType', type: 'select', label: 'Tipo de receptor', required: true,
        options: [
          { value: 'AUTHORIZED_DONATARIA', label: 'Donataria autorizada por el SAT' },
          { value: 'FEDERATION_STATE_MUNICIPALITY_OR_DECENTRALIZED', label: 'Federación, estado, municipio o ente público' },
        ],
      })
      fields.push({ name: 'donationIsOnerousOrRemunerative', type: 'toggle', label: '¿El donativo es oneroso o remunerativo?', hint: 'Debe ser NO para ser deducible' })
      break

    case 'PERSONAL_RETIREMENT_CONTRIBUTION':
      fields.push({ name: 'meetsRetirementPermanenceRequirement', type: 'toggle', label: '¿Cumple el requisito de permanencia?', required: true })
      break

    case 'PERSONAL_MORTGAGE_REAL_INTEREST':
      fields.push({ name: 'interestAmountIsRealInterest', type: 'toggle', label: '¿Son intereses reales (no nominales)?', required: true })
      fields.push({ name: 'mortgageCreditWithin750kUdisLimit', type: 'toggle', label: '¿El crédito hipotecario es ≤ 750,000 UDIS?', required: true })
      break

    case 'BUSINESS_INVESTMENT':
      fields.push({ name: 'isStrictlyIndispensableForActivity', type: 'toggle', label: '¿Es estrictamente indispensable para tu actividad?', required: true })
      fields.push({ name: 'assetType', type: 'select', label: 'Tipo de activo', required: true,
        options: [
          { value: 'COMPUTER_EQUIPMENT', label: 'Equipo de cómputo (30%)' },
          { value: 'AUTOMOBILE', label: 'Automóvil (25%)' },
          { value: 'CONSTRUCTION', label: 'Construcción (5%)' },
          { value: 'INSTALLATION_EXPENSES', label: 'Gastos de instalación (10%)' },
          { value: 'OFFICE_FURNITURE', label: 'Mobiliario de oficina (10%)' },
        ],
      })
      break

    case 'ARR_PROPERTY_TAX':
    case 'ARR_CONSTRUCTION_INVESTMENT':
      fields.push({ name: 'isActuallyPaid', type: 'toggle', label: '¿Está efectivamente pagado?', required: true })
      break

    default:
      if (isBusiness) {
        fields.push({ name: 'isStrictlyIndispensableForActivity', type: 'toggle', label: '¿Es estrictamente indispensable para tu actividad?', required: true })
        fields.push({ name: 'isActuallyPaid', type: 'toggle', label: '¿Está efectivamente pagado?', required: true })
      } else if (isArr) {
        fields.push({ name: 'isActuallyPaid', type: 'toggle', label: '¿Está efectivamente pagado?', required: true })
      }
  }

  return fields
}
