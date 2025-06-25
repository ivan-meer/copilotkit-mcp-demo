/**
 * Schema-Driven UI Generator
 * 
 * Intelligent UI schema generation from various sources including JSON Schema,
 * MCP tool definitions, OpenAPI specs, and data samples. Uses AI-assisted
 * analysis to create optimal user interfaces.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

import {
  UISchema,
  UIComponentConfig,
  FormFieldConfig,
  DisplayComponentConfig,
  LayoutContainerConfig,
  UIComponentType,
  LayoutType,
  ThemeVariant,
  SizeVariant,
  SchemaGenerationContext,
  UIGenerationResult,
  SchemaValidationError,
  MCPParameterType,
} from './types';
import {
  EnhancedMCPTool,
  MCPParameterSchema,
} from '../mcp/enhanced-types';

/**
 * Schema Generator Configuration
 */
interface SchemaGeneratorConfig {
  // AI assistance
  useAIOptimization: boolean;
  aiProvider?: any; // AI provider for optimization
  
  // Default settings
  defaultTheme: string;
  defaultLayout: LayoutType;
  maxNestingDepth: number;
  
  // Performance
  enableCaching: boolean;
  cacheSize: number;
  
  // Feature flags
  experimentalFeatures: string[];
}

/**
 * Field type mapping from parameter types to UI components
 */
const PARAMETER_TYPE_MAP: Record<MCPParameterType, UIComponentType> = {
  [MCPParameterType.STRING]: UIComponentType.TEXT_INPUT,
  [MCPParameterType.NUMBER]: UIComponentType.NUMBER_INPUT,
  [MCPParameterType.INTEGER]: UIComponentType.NUMBER_INPUT,
  [MCPParameterType.BOOLEAN]: UIComponentType.CHECKBOX,
  [MCPParameterType.ARRAY]: UIComponentType.MULTI_SELECT,
  [MCPParameterType.OBJECT]: UIComponentType.GROUP,
  [MCPParameterType.NULL]: UIComponentType.TEXT,
};

/**
 * Widget type mapping from UI hints
 */
const WIDGET_TYPE_MAP: Record<string, UIComponentType> = {
  'input': UIComponentType.TEXT_INPUT,
  'textarea': UIComponentType.TEXTAREA,
  'select': UIComponentType.SELECT,
  'checkbox': UIComponentType.CHECKBOX,
  'radio': UIComponentType.RADIO_GROUP,
  'slider': UIComponentType.SLIDER,
  'date': UIComponentType.DATE_PICKER,
  'time': UIComponentType.TIME_PICKER,
  'datetime': UIComponentType.DATETIME_PICKER,
  'file': UIComponentType.FILE_UPLOAD,
  'color': UIComponentType.COLOR_PICKER,
};

/**
 * Schema-Driven UI Generator
 */
export class SchemaGenerator {
  private config: SchemaGeneratorConfig;
  private cache: Map<string, UISchema> = new Map();
  
  constructor(config?: Partial<SchemaGeneratorConfig>) {
    this.config = {
      useAIOptimization: false,
      defaultTheme: 'modern',
      defaultLayout: LayoutType.VERTICAL,
      maxNestingDepth: 5,
      enableCaching: true,
      cacheSize: 100,
      experimentalFeatures: [],
      ...config,
    };
  }
  
  /**
   * Generate UI schema from MCP tool definition
   */
  async generateFromMCPTool(
    tool: EnhancedMCPTool,
    context?: Partial<SchemaGenerationContext>
  ): Promise<UIGenerationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    console.log(`🎨 Generating UI schema for tool: ${tool.name}`);
    
    // Create generation context
    const fullContext: SchemaGenerationContext = {
      tool,
      options: {
        includeMetadata: true,
        generateExamples: true,
        optimizeForMobile: false,
        theme: this.config.defaultTheme,
        locale: 'en',
        preferredLayout: this.config.defaultLayout,
        maxFormWidth: 600,
        compactMode: false,
        a11y: {
          labels: true,
          descriptions: true,
          keyboardNavigation: true,
          screenReaderSupport: true,
        },
      },
      ...context,
    };
    
    // Check cache
    const cacheKey = this.generateCacheKey(tool, fullContext);
    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      console.log(`📦 Using cached schema for tool: ${tool.name}`);
      return {
        schema: this.cache.get(cacheKey)!,
        component: null as any, // Will be rendered separately
        metadata: {
          generationTime: 0,
          componentCount: 0,
          warnings: [],
          suggestions: ['Using cached schema'],
        },
      };
    }
    
    try {
      // Generate form fields from input schema
      const formFields = await this.generateFormFields(
        tool.inputSchema,
        fullContext,
        warnings,
        suggestions
      );
      
      // Generate result display configuration
      const resultDisplay = this.generateResultDisplay(tool, fullContext);
      
      // Create main layout
      const mainLayout = this.createMainLayout(
        tool,
        formFields,
        resultDisplay,
        fullContext
      );
      
      // Create UI schema
      const schema: UISchema = {
        id: `tool_${tool.name}_${Date.now()}`,
        title: tool.name,
        description: tool.description,
        version: '1.0.0',
        layout: mainLayout,
        theme: this.generateTheme(fullContext),
        metadata: {
          author: 'Universal AI Chat Hub',
          tags: tool.metadata?.tags || [],
          category: tool.metadata?.category || 'general',
        },
        validation: {
          mode: 'onChange',
          validateOnMount: false,
          reValidateMode: 'onChange',
        },
        i18n: {
          locale: fullContext.options.locale || 'en',
          rtl: false,
        },
      };
      
      // Apply AI optimization if enabled
      if (this.config.useAIOptimization && this.config.aiProvider) {
        await this.optimizeWithAI(schema, fullContext, suggestions);
      }
      
      // Cache the result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, schema);
        this.maintainCache();
      }
      
      const generationTime = Date.now() - startTime;
      const componentCount = this.countComponents(mainLayout);
      
      console.log(`✅ Generated UI schema for ${tool.name} in ${generationTime}ms`);
      
      return {
        schema,
        component: null as any, // Will be rendered by UIRenderer
        metadata: {
          generationTime,
          componentCount,
          warnings,
          suggestions,
        },
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate UI schema for ${tool.name}:`, error);
      throw new SchemaValidationError(
        `Failed to generate UI schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tool: tool.name, context: fullContext }
      );
    }
  }
  
  /**
   * Generate UI schema from JSON Schema
   */
  async generateFromJSONSchema(
    jsonSchema: any,
    context?: Partial<SchemaGenerationContext>
  ): Promise<UIGenerationResult> {
    console.log(`🎨 Generating UI schema from JSON Schema`);
    
    // Convert JSON Schema to MCP-like tool format
    const mockTool: EnhancedMCPTool = {
      name: jsonSchema.title || 'form',
      description: jsonSchema.description || 'Generated form',
      inputSchema: {
        type: 'object',
        properties: jsonSchema.properties || {},
        required: jsonSchema.required || [],
      },
    };
    
    return this.generateFromMCPTool(mockTool, context);
  }
  
  /**
   * Generate form fields from input schema
   */
  private async generateFormFields(
    inputSchema: any,
    context: SchemaGenerationContext,
    warnings: string[],
    suggestions: string[]
  ): Promise<FormFieldConfig[]> {
    const fields: FormFieldConfig[] = [];
    const properties = inputSchema.properties || {};
    const required = inputSchema.required || [];
    
    // Group fields if grouping hints are available
    const groups = this.extractFieldGroups(context.tool?.metadata?.ui?.form?.grouping);
    
    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      try {
        const field = await this.generateFormField(
          fieldName,
          fieldSchema as MCPParameterSchema,
          required.includes(fieldName),
          context,
          groups[fieldName]
        );
        
        if (field) {
          fields.push(field);
        }
      } catch (error) {
        warnings.push(`Failed to generate field '${fieldName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Sort fields by order hint or alphabetically
    const fieldOrder = context.tool?.metadata?.ui?.form?.fieldOrder || [];
    fields.sort((a, b) => {
      const indexA = fieldOrder.indexOf(a.name);
      const indexB = fieldOrder.indexOf(b.name);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      } else if (indexA !== -1) {
        return -1;
      } else if (indexB !== -1) {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    
    // Add suggestions for form improvements
    if (fields.length > 10) {
      suggestions.push('Consider using tabs or accordion layout for better organization');
    }
    
    if (fields.some(f => f.type === UIComponentType.FILE_UPLOAD)) {
      suggestions.push('Add file validation and preview functionality');
    }
    
    return fields;
  }
  
  /**
   * Generate individual form field
   */
  private async generateFormField(
    fieldName: string,
    fieldSchema: MCPParameterSchema,
    isRequired: boolean,
    context: SchemaGenerationContext,
    group?: string
  ): Promise<FormFieldConfig | null> {
    const uiHints = fieldSchema.ui || {};
    
    // Determine component type
    let componentType = this.determineComponentType(fieldSchema, uiHints);
    
    // Apply overrides
    const override = context.overrides?.components?.[fieldName];
    if (override?.type) {
      componentType = override.type;
    }
    
    // Base field configuration
    const field: FormFieldConfig = {
      type: componentType,
      id: `field_${fieldName}`,
      name: fieldName,
      label: this.generateLabel(fieldName, fieldSchema.description),
      description: fieldSchema.description,
      required: isRequired,
      defaultValue: fieldSchema.default,
      placeholder: uiHints.placeholder || this.generatePlaceholder(fieldName, fieldSchema),
      helpText: uiHints.help,
      
      // Validation
      validation: {
        required: isRequired,
        pattern: fieldSchema.pattern,
        minLength: fieldSchema.minLength,
        maxLength: fieldSchema.maxLength,
        min: fieldSchema.minimum,
        max: fieldSchema.maximum,
      },
      
      // Layout
      layout: {
        width: uiHints.width === 'full' ? '100%' : 
               uiHints.width === 'half' ? '50%' :
               uiHints.width === 'third' ? '33.33%' :
               uiHints.width === 'quarter' ? '25%' : 'auto',
        gridColumn: group ? `group-${group}` : undefined,
      },
      
      // Conditional rendering
      condition: this.generateCondition(fieldName, context.tool?.metadata?.ui?.form?.conditionalFields),
      
      // Component-specific props
      props: {
        sensitive: uiHints.sensitive,
        readOnly: uiHints.readonly,
        hidden: uiHints.hidden,
      },
    };
    
    // Configure component-specific properties
    this.configureComponentSpecificProps(field, fieldSchema, uiHints);
    
    return field;
  }
  
  /**
   * Determine appropriate component type for a field
   */
  private determineComponentType(
    fieldSchema: MCPParameterSchema,
    uiHints: any
  ): UIComponentType {
    // Use explicit widget hint if provided
    if (uiHints.widget && WIDGET_TYPE_MAP[uiHints.widget]) {
      return WIDGET_TYPE_MAP[uiHints.widget];
    }
    
    // Use enum for select components
    if (fieldSchema.enum && fieldSchema.enum.length > 0) {
      return fieldSchema.enum.length <= 5 ? UIComponentType.RADIO_GROUP : UIComponentType.SELECT;
    }
    
    // Use format hints
    if (fieldSchema.format) {
      switch (fieldSchema.format) {
        case 'email': return UIComponentType.TEXT_INPUT;
        case 'password': return UIComponentType.TEXT_INPUT;
        case 'url': return UIComponentType.TEXT_INPUT;
        case 'date': return UIComponentType.DATE_PICKER;
        case 'time': return UIComponentType.TIME_PICKER;
        case 'date-time': return UIComponentType.DATETIME_PICKER;
        case 'color': return UIComponentType.COLOR_PICKER;
      }
    }
    
    // Use string length hints
    if (fieldSchema.type === MCPParameterType.STRING) {
      if (fieldSchema.maxLength && fieldSchema.maxLength > 100) {
        return UIComponentType.TEXTAREA;
      }
    }
    
    // Use array hints
    if (fieldSchema.type === MCPParameterType.ARRAY) {
      if (fieldSchema.items?.enum) {
        return UIComponentType.MULTI_SELECT;
      }
    }
    
    // Fall back to type mapping
    const baseType = Array.isArray(fieldSchema.type) ? fieldSchema.type[0] : fieldSchema.type;
    return PARAMETER_TYPE_MAP[baseType] || UIComponentType.TEXT_INPUT;
  }
  
  /**
   * Configure component-specific properties
   */
  private configureComponentSpecificProps(
    field: FormFieldConfig,
    fieldSchema: MCPParameterSchema,
    uiHints: any
  ): void {
    switch (field.type) {
      case UIComponentType.SELECT:
      case UIComponentType.MULTI_SELECT:
        field.selectProps = {
          options: (fieldSchema.enum || []).map(value => ({
            label: String(value),
            value,
          })),
          searchable: uiHints.searchable,
          clearable: !field.required,
          creatable: uiHints.creatable,
        };
        break;
        
      case UIComponentType.SLIDER:
        field.props = {
          ...field.props,
          min: fieldSchema.minimum || 0,
          max: fieldSchema.maximum || 100,
          step: fieldSchema.type === MCPParameterType.INTEGER ? 1 : 0.1,
        };
        break;
        
      case UIComponentType.FILE_UPLOAD:
        field.fileProps = {
          accept: uiHints.accept,
          multiple: fieldSchema.type === MCPParameterType.ARRAY,
          maxSize: uiHints.maxSize || 10 * 1024 * 1024, // 10MB default
          preview: uiHints.preview !== false,
        };
        break;
        
      case UIComponentType.TEXT_INPUT:
        field.inputProps = {
          maxLength: fieldSchema.maxLength,
          pattern: fieldSchema.pattern,
          autoComplete: this.generateAutoComplete(field.name),
        };
        
        if (fieldSchema.format === 'password') {
          field.props = { ...field.props, type: 'password' };
        } else if (fieldSchema.format === 'email') {
          field.props = { ...field.props, type: 'email' };
        } else if (fieldSchema.format === 'url') {
          field.props = { ...field.props, type: 'url' };
        }
        break;
        
      case UIComponentType.NUMBER_INPUT:
        field.inputProps = {
          step: fieldSchema.type === MCPParameterType.INTEGER ? 1 : 0.01,
        };
        field.validation = {
          ...field.validation,
          min: fieldSchema.minimum,
          max: fieldSchema.maximum,
        };
        break;
    }
  }
  
  /**
   * Generate result display configuration
   */
  private generateResultDisplay(
    tool: EnhancedMCPTool,
    context: SchemaGenerationContext
  ): DisplayComponentConfig {
    const resultHints = tool.metadata?.ui?.result;
    
    return {
      type: this.determineResultDisplayType(resultHints),
      id: 'result_display',
      label: 'Result',
      data: null, // Will be populated when tool executes
      
      // Configure based on hints
      tableProps: resultHints?.format === 'table' ? {
        columns: [], // Will be inferred from data
        pagination: true,
        pageSize: 20,
        sortable: true,
        filterable: true,
      } : undefined,
      
      chartProps: resultHints?.visualization ? {
        xAxis: resultHints.visualization.xAxis,
        yAxis: resultHints.visualization.yAxis,
        groupBy: resultHints.visualization.groupBy,
        colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'],
        legend: true,
        tooltip: true,
        animation: true,
      } : undefined,
      
      codeProps: resultHints?.format === 'json' ? {
        language: 'json',
        theme: context.options.theme === 'dark' ? 'dark' : 'light',
        lineNumbers: true,
        readOnly: true,
      } : undefined,
      
      markdownProps: resultHints?.format === 'markdown' ? {
        sanitize: true,
        breaks: true,
        linkify: true,
        typographer: true,
      } : undefined,
    };
  }
  
  /**
   * Determine result display type
   */
  private determineResultDisplayType(resultHints?: any): UIComponentType {
    if (!resultHints) return UIComponentType.JSON_VIEWER;
    
    switch (resultHints.format) {
      case 'table': return UIComponentType.TABLE;
      case 'markdown': return UIComponentType.MARKDOWN;
      case 'html': return UIComponentType.TEXT; // TODO: Add HTML viewer
      case 'json': return UIComponentType.JSON_VIEWER;
      case 'chart': return UIComponentType.BAR_CHART; // Default chart type
      default: return UIComponentType.JSON_VIEWER;
    }
  }
  
  /**
   * Create main layout structure
   */
  private createMainLayout(
    tool: EnhancedMCPTool,
    formFields: FormFieldConfig[],
    resultDisplay: DisplayComponentConfig,
    context: SchemaGenerationContext
  ): LayoutContainerConfig {
    const layoutHint = tool.metadata?.ui?.form?.layout || context.options.preferredLayout;
    
    return {
      type: UIComponentType.CONTAINER,
      id: 'main_layout',
      layout: {
        type: LayoutType.VERTICAL,
        padding: context.options.compactMode ? 16 : 24,
      },
      children: [
        // Tool header
        this.createToolHeader(tool),
        
        // Form section
        this.createFormSection(formFields, layoutHint, context),
        
        // Action buttons
        this.createActionButtons(tool, context),
        
        // Result section
        this.createResultSection(resultDisplay, context),
      ],
      containerProps: {
        maxWidth: context.options.maxFormWidth || 600,
        centered: true,
        padded: true,
        elevated: true,
      },
    };
  }
  
  /**
   * Create tool header section
   */
  private createToolHeader(tool: EnhancedMCPTool): UIComponentConfig {
    return {
      type: UIComponentType.CARD,
      id: 'tool_header',
      layout: { padding: 16, margin: '0 0 24px 0' },
      children: [
        {
          type: UIComponentType.TEXT,
          id: 'tool_title',
          props: {
            variant: 'h4',
            content: tool.name,
          },
        },
        ...(tool.description ? [{
          type: UIComponentType.TEXT,
          id: 'tool_description',
          props: {
            variant: 'body1',
            content: tool.description,
            color: 'textSecondary',
          },
        }] : []),
        ...(tool.metadata?.tags ? [{
          type: UIComponentType.GROUP,
          id: 'tool_tags',
          layout: { type: LayoutType.HORIZONTAL, gap: 8 },
          children: tool.metadata.tags.map((tag, index) => ({
            type: UIComponentType.BADGE,
            id: `tag_${index}`,
            props: {
              label: tag,
              variant: ThemeVariant.SECONDARY,
              size: SizeVariant.SM,
            },
          })),
        }] : []),
      ],
    } as LayoutContainerConfig;
  }
  
  /**
   * Create form section
   */
  private createFormSection(
    formFields: FormFieldConfig[],
    layoutHint?: string,
    context?: SchemaGenerationContext
  ): LayoutContainerConfig {
    // Group fields by group hint
    const groupedFields = this.groupFields(formFields);
    
    return {
      type: UIComponentType.GROUP,
      id: 'form_section',
      layout: {
        type: layoutHint === 'horizontal' ? LayoutType.HORIZONTAL : LayoutType.VERTICAL,
        gap: 16,
      },
      children: Object.entries(groupedFields).map(([groupName, fields]) => {
        if (groupName === 'default') {
          // Ungrouped fields
          return {
            type: UIComponentType.GROUP,
            id: 'default_fields',
            layout: { type: LayoutType.VERTICAL, gap: 16 },
            children: fields,
          };
        } else {
          // Grouped fields in a card
          return {
            type: UIComponentType.CARD,
            id: `group_${groupName}`,
            label: groupName,
            layout: { padding: 16, margin: '0 0 16px 0' },
            children: [
              {
                type: UIComponentType.TEXT,
                id: `group_${groupName}_title`,
                props: {
                  variant: 'h6',
                  content: groupName,
                },
              },
              {
                type: UIComponentType.GROUP,
                id: `group_${groupName}_fields`,
                layout: { type: LayoutType.VERTICAL, gap: 12 },
                children: fields,
              },
            ],
          } as LayoutContainerConfig;
        }
      }),
    };
  }
  
  /**
   * Create action buttons
   */
  private createActionButtons(
    tool: EnhancedMCPTool,
    context: SchemaGenerationContext
  ): LayoutContainerConfig {
    const confirmationRequired = tool.metadata?.ui?.confirmationRequired;
    
    return {
      type: UIComponentType.GROUP,
      id: 'action_buttons',
      layout: {
        type: LayoutType.HORIZONTAL,
        justify: 'end',
        gap: 12,
        margin: '24px 0',
      },
      children: [
        {
          type: UIComponentType.BUTTON,
          id: 'reset_button',
          label: 'Reset',
          variant: ThemeVariant.SECONDARY,
          buttonProps: {
            fullWidth: false,
          },
          events: {
            onClick: () => console.log('Form reset'),
          },
        },
        {
          type: UIComponentType.BUTTON,
          id: 'submit_button',
          label: confirmationRequired ? 'Confirm & Execute' : 'Execute',
          variant: ThemeVariant.PRIMARY,
          buttonProps: {
            fullWidth: false,
            icon: confirmationRequired ? '⚠️' : '▶️',
          },
          events: {
            onSubmit: (data: any) => console.log('Form submitted:', data),
          },
        },
      ],
    };
  }
  
  /**
   * Create result section
   */
  private createResultSection(
    resultDisplay: DisplayComponentConfig,
    context: SchemaGenerationContext
  ): LayoutContainerConfig {
    return {
      type: UIComponentType.GROUP,
      id: 'result_section',
      layout: {
        type: LayoutType.VERTICAL,
        margin: '24px 0 0 0',
      },
      children: [
        {
          type: UIComponentType.TEXT,
          id: 'result_title',
          props: {
            variant: 'h6',
            content: 'Result',
          },
        },
        resultDisplay,
      ],
      condition: {
        dependsOn: 'execution_status',
        operator: 'equals',
        value: 'completed',
      },
    };
  }
  
  /**
   * Generate theme configuration
   */
  private generateTheme(context: SchemaGenerationContext): any {
    return {
      colorScheme: 'auto',
      primaryColor: '#3b82f6',
      accentColor: '#10b981',
      customCSS: `
        .universal-ai-form {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        .universal-ai-form .field-group {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
        }
        .universal-ai-form .result-display {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #ffffff;
        }
      `,
    };
  }
  
  /**
   * Helper methods
   */
  private generateLabel(fieldName: string, description?: string): string {
    // Convert camelCase/snake_case to Title Case
    const label = fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
    
    return label;
  }
  
  private generatePlaceholder(fieldName: string, fieldSchema: MCPParameterSchema): string {
    if (fieldSchema.examples && fieldSchema.examples.length > 0) {
      return `e.g., ${fieldSchema.examples[0]}`;
    }
    
    const label = this.generateLabel(fieldName);
    return `Enter ${label.toLowerCase()}...`;
  }
  
  private generateAutoComplete(fieldName: string): string {
    const fieldLower = fieldName.toLowerCase();
    
    if (fieldLower.includes('email')) return 'email';
    if (fieldLower.includes('name')) return 'name';
    if (fieldLower.includes('phone')) return 'tel';
    if (fieldLower.includes('address')) return 'address-line1';
    if (fieldLower.includes('city')) return 'address-level2';
    if (fieldLower.includes('country')) return 'country';
    if (fieldLower.includes('postal') || fieldLower.includes('zip')) return 'postal-code';
    
    return 'off';
  }
  
  private extractFieldGroups(grouping?: Record<string, string[]>): Record<string, string> {
    const fieldToGroup: Record<string, string> = {};
    
    if (grouping) {
      for (const [groupName, fields] of Object.entries(grouping)) {
        for (const field of fields) {
          fieldToGroup[field] = groupName;
        }
      }
    }
    
    return fieldToGroup;
  }
  
  private groupFields(fields: FormFieldConfig[]): Record<string, FormFieldConfig[]> {
    const groups: Record<string, FormFieldConfig[]> = { default: [] };
    
    for (const field of fields) {
      const groupName = field.layout?.gridColumn?.replace('group-', '') || 'default';
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      
      groups[groupName].push(field);
    }
    
    return groups;
  }
  
  private generateCondition(
    fieldName: string,
    conditionalFields?: Record<string, { dependsOn: string; condition: any }>
  ): any {
    return conditionalFields?.[fieldName] ? {
      dependsOn: conditionalFields[fieldName].dependsOn,
      operator: 'equals',
      value: conditionalFields[fieldName].condition,
    } : undefined;
  }
  
  private generateCacheKey(tool: EnhancedMCPTool, context: SchemaGenerationContext): string {
    return `${tool.name}_${JSON.stringify(context.options)}_${tool.metadata?.category || 'default'}`;
  }
  
  private maintainCache(): void {
    if (this.cache.size > this.config.cacheSize) {
      const entries = Array.from(this.cache.entries());
      const toDelete = entries.slice(0, entries.length - this.config.cacheSize);
      
      for (const [key] of toDelete) {
        this.cache.delete(key);
      }
    }
  }
  
  private countComponents(layout: LayoutContainerConfig): number {
    let count = 1; // Count the layout itself
    
    if (layout.children) {
      for (const child of layout.children) {
        if ('children' in child && child.children) {
          count += this.countComponents(child as LayoutContainerConfig);
        } else {
          count++;
        }
      }
    }
    
    return count;
  }
  
  /**
   * AI-assisted optimization (placeholder)
   */
  private async optimizeWithAI(
    schema: UISchema,
    context: SchemaGenerationContext,
    suggestions: string[]
  ): Promise<void> {
    // TODO: Implement AI-assisted optimization
    // This could analyze the schema and suggest improvements
    suggestions.push('AI optimization not yet implemented');
  }
}

// TODO: Implement AI-assisted layout optimization
// TODO: Add support for custom component libraries
// FIXME: Validation should be more comprehensive
// TODO: Implement proper internationalization support
// TODO: Add accessibility features and ARIA labels