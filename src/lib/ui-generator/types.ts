/**
 * Dynamic UI Generation Types
 * 
 * Type definitions for the Universal AI Chat Hub's dynamic UI generation system.
 * Supports schema-driven UI generation, component rendering, and interactive forms.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

import { ReactNode, ComponentType } from 'react';
import { EnhancedMCPTool, MCPParameterSchema, MCPParameterType } from '../mcp/enhanced-types';

/**
 * UI component types for different data representations
 */
export enum UIComponentType {
  // Form components
  TEXT_INPUT = 'text_input',
  TEXTAREA = 'textarea',
  NUMBER_INPUT = 'number_input',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  CHECKBOX = 'checkbox',
  RADIO_GROUP = 'radio_group',
  SLIDER = 'slider',
  DATE_PICKER = 'date_picker',
  TIME_PICKER = 'time_picker',
  DATETIME_PICKER = 'datetime_picker',
  FILE_UPLOAD = 'file_upload',
  COLOR_PICKER = 'color_picker',
  
  // Display components
  TEXT = 'text',
  MARKDOWN = 'markdown',
  CODE = 'code',
  JSON_VIEWER = 'json_viewer',
  TABLE = 'table',
  LIST = 'list',
  CARD = 'card',
  BADGE = 'badge',
  PROGRESS = 'progress',
  
  // Layout components
  CONTAINER = 'container',
  GROUP = 'group',
  TABS = 'tabs',
  ACCORDION = 'accordion',
  MODAL = 'modal',
  DRAWER = 'drawer',
  
  // Chart components
  BAR_CHART = 'bar_chart',
  LINE_CHART = 'line_chart',
  PIE_CHART = 'pie_chart',
  SCATTER_CHART = 'scatter_chart',
  AREA_CHART = 'area_chart',
  
  // Interactive components
  BUTTON = 'button',
  LINK = 'link',
  TOGGLE = 'toggle',
  RATING = 'rating',
  
  // Media components
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  
  // Custom components
  CUSTOM = 'custom',
}

/**
 * Layout types for component arrangement
 */
export enum LayoutType {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
  GRID = 'grid',
  FLEX = 'flex',
  ABSOLUTE = 'absolute',
}

/**
 * Theme variants
 */
export enum ThemeVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info',
}

/**
 * Size variants
 */
export enum SizeVariant {
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
}

/**
 * Base UI component configuration
 */
export interface UIComponentConfig {
  type: UIComponentType;
  id: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  
  // Styling
  variant?: ThemeVariant;
  size?: SizeVariant;
  className?: string;
  style?: Record<string, any>;
  
  // Layout
  layout?: {
    type?: LayoutType;
    width?: string | number;
    height?: string | number;
    flex?: number;
    gridColumn?: string;
    gridRow?: string;
    padding?: string | number;
    margin?: string | number;
  };
  
  // Validation
  validation?: {
    required?: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: any) => string | null;
  };
  
  // Events
  events?: {
    onChange?: (value: any) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onClick?: () => void;
    onSubmit?: (data: any) => void;
  };
  
  // Conditional rendering
  condition?: {
    dependsOn: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less';
    value: any;
  };
  
  // Component-specific props
  props?: Record<string, any>;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig extends UIComponentConfig {
  name: string;
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
  
  // Input-specific props
  inputProps?: {
    autoComplete?: string;
    autoFocus?: boolean;
    maxLength?: number;
    pattern?: string;
    step?: number;
    multiple?: boolean;
  };
  
  // Select-specific props
  selectProps?: {
    options: Array<{
      label: string;
      value: any;
      disabled?: boolean;
      group?: string;
    }>;
    searchable?: boolean;
    clearable?: boolean;
    creatable?: boolean;
  };
  
  // File upload props
  fileProps?: {
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    preview?: boolean;
  };
}

/**
 * Display component configuration
 */
export interface DisplayComponentConfig extends UIComponentConfig {
  data: any;
  
  // Table-specific props
  tableProps?: {
    columns: Array<{
      key: string;
      label: string;
      sortable?: boolean;
      filterable?: boolean;
      width?: string | number;
      formatter?: (value: any) => ReactNode;
    }>;
    pagination?: boolean;
    pageSize?: number;
    sortable?: boolean;
    filterable?: boolean;
    selectable?: boolean;
  };
  
  // Chart-specific props
  chartProps?: {
    xAxis?: string;
    yAxis?: string | string[];
    groupBy?: string;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    colors?: string[];
    legend?: boolean;
    tooltip?: boolean;
    animation?: boolean;
  };
  
  // Code-specific props
  codeProps?: {
    language?: string;
    theme?: string;
    lineNumbers?: boolean;
    highlightLines?: number[];
    readOnly?: boolean;
  };
  
  // Markdown-specific props
  markdownProps?: {
    sanitize?: boolean;
    breaks?: boolean;
    linkify?: boolean;
    typographer?: boolean;
  };
}

/**
 * Layout container configuration
 */
export interface LayoutContainerConfig extends UIComponentConfig {
  children: UIComponentConfig[];
  
  // Container-specific props
  containerProps?: {
    maxWidth?: string | number;
    centered?: boolean;
    padded?: boolean;
    elevated?: boolean;
    bordered?: boolean;
  };
  
  // Grid-specific props
  gridProps?: {
    columns?: number;
    gap?: string | number;
    autoFit?: boolean;
    minColumnWidth?: string | number;
  };
  
  // Flex-specific props
  flexProps?: {
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
    wrap?: boolean;
    gap?: string | number;
  };
  
  // Tabs-specific props
  tabsProps?: {
    defaultTab?: string;
    variant?: 'default' | 'pills' | 'underline';
    orientation?: 'horizontal' | 'vertical';
  };
}

/**
 * Interactive component configuration
 */
export interface InteractiveComponentConfig extends UIComponentConfig {
  // Button-specific props
  buttonProps?: {
    loading?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    href?: string;
    target?: string;
  };
  
  // Link-specific props
  linkProps?: {
    href: string;
    target?: string;
    external?: boolean;
    underline?: boolean;
  };
}

/**
 * UI schema for complete interface definition
 */
export interface UISchema {
  id: string;
  title?: string;
  description?: string;
  version?: string;
  
  // Root layout
  layout: LayoutContainerConfig;
  
  // Global theme
  theme?: {
    colorScheme?: 'light' | 'dark' | 'auto';
    primaryColor?: string;
    accentColor?: string;
    customCSS?: string;
    customComponents?: Record<string, ComponentType<any>>;
  };
  
  // Metadata
  metadata?: {
    author?: string;
    tags?: string[];
    category?: string;
    preview?: string; // Base64 image or URL
  };
  
  // Validation schema
  validation?: {
    mode?: 'onChange' | 'onBlur' | 'onSubmit';
    validateOnMount?: boolean;
    reValidateMode?: 'onChange' | 'onBlur';
  };
  
  // Internationalization
  i18n?: {
    locale?: string;
    messages?: Record<string, string>;
    rtl?: boolean;
  };
}

/**
 * Schema generation context
 */
export interface SchemaGenerationContext {
  // Source data
  tool?: EnhancedMCPTool;
  schema?: any; // JSON Schema
  data?: any; // Sample data
  
  // Generation options
  options: {
    includeMetadata?: boolean;
    generateExamples?: boolean;
    optimizeForMobile?: boolean;
    theme?: string;
    locale?: string;
    
    // UI hints
    preferredLayout?: LayoutType;
    maxFormWidth?: number;
    compactMode?: boolean;
    
    // Accessibility
    a11y?: {
      labels?: boolean;
      descriptions?: boolean;
      keyboardNavigation?: boolean;
      screenReaderSupport?: boolean;
    };
  };
  
  // Custom overrides
  overrides?: {
    components?: Record<string, Partial<UIComponentConfig>>;
    layout?: Partial<LayoutContainerConfig>;
    theme?: Record<string, any>;
  };
}

/**
 * Component renderer interface
 */
export interface UIComponentRenderer {
  type: UIComponentType;
  component: ComponentType<any>;
  props?: Record<string, any>;
  dependencies?: string[]; // Required libraries
}

/**
 * Form submission result
 */
export interface FormSubmissionResult {
  success: boolean;
  data?: any;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  metadata?: {
    submissionId: string;
    timestamp: Date;
    processingTime: number;
  };
}

/**
 * UI generation result
 */
export interface UIGenerationResult {
  schema: UISchema;
  component: ReactNode;
  metadata: {
    generationTime: number;
    componentCount: number;
    warnings: string[];
    suggestions: string[];
  };
}

/**
 * Component library definition
 */
export interface ComponentLibrary {
  name: string;
  version: string;
  description?: string;
  
  // Available renderers
  renderers: Map<UIComponentType, UIComponentRenderer>;
  
  // Default configurations
  defaults: {
    theme: Record<string, any>;
    spacing: Record<string, string | number>;
    typography: Record<string, any>;
    breakpoints: Record<string, string | number>;
  };
  
  // Validation functions
  validators: Map<string, (value: any, config: any) => string | null>;
  
  // Custom hooks
  hooks?: Record<string, (...args: any[]) => any>;
}

/**
 * Error types for UI generation
 */
export class UIGenerationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public context?: any
  ) {
    super(message);
    this.name = 'UIGenerationError';
  }
}

export class SchemaValidationError extends UIGenerationError {
  constructor(message: string, context?: any) {
    super(message, 'SCHEMA_VALIDATION_ERROR', context);
    this.name = 'SchemaValidationError';
  }
}

export class ComponentNotFoundError extends UIGenerationError {
  constructor(componentType: string) {
    super(`Component type '${componentType}' not found in component library`, 'COMPONENT_NOT_FOUND');
    this.name = 'ComponentNotFoundError';
  }
}

export class RenderingError extends UIGenerationError {
  constructor(message: string, componentType: string, context?: any) {
    super(`Rendering error in ${componentType}: ${message}`, 'RENDERING_ERROR', context);
    this.name = 'RenderingError';
  }
}

// TODO: Add support for complex validation rules
// TODO: Implement accessibility features
// FIXME: Component props should be more type-safe
// TODO: Add support for custom component libraries
// TODO: Implement theme system with CSS variables