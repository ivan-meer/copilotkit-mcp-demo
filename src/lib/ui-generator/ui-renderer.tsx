/**
 * Dynamic UI Renderer
 * 
 * React component renderer that takes UI schemas and generates interactive
 * components at runtime. Supports form rendering, data visualization,
 * and complex layouts with full validation and event handling.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import {
  UISchema,
  UIComponentConfig,
  FormFieldConfig,
  DisplayComponentConfig,
  LayoutContainerConfig,
  InteractiveComponentConfig,
  UIComponentType,
  LayoutType,
  ThemeVariant,
  SizeVariant,
  FormSubmissionResult,
  ComponentLibrary,
  RenderingError,
  ComponentNotFoundError,
} from './types';

/**
 * Props for the main UI renderer
 */
interface UIRendererProps {
  schema: UISchema;
  data?: any;
  onSubmit?: (data: any) => Promise<FormSubmissionResult>;
  onChange?: (data: any) => void;
  componentLibrary?: ComponentLibrary;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Props for individual component renderers
 */
interface ComponentRendererProps {
  config: UIComponentConfig;
  data?: any;
  onUpdate?: (value: any) => void;
  componentLibrary?: ComponentLibrary;
}

/**
 * Default component library with basic HTML/React components
 */
const defaultComponentLibrary: ComponentLibrary = {
  name: 'Default',
  version: '1.0.0',
  description: 'Default component library with basic HTML components',
  
  renderers: new Map([
    [UIComponentType.TEXT_INPUT, {
      type: UIComponentType.TEXT_INPUT,
      component: ({ config, value, onChange }: any) => (
        <input
          type={config.props?.type || 'text'}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={config.placeholder}
          required={config.required}
          disabled={config.disabled}
          className={`form-input ${config.className || ''}`}
          style={config.style}
          {...config.inputProps}
        />
      ),
    }],
    
    [UIComponentType.TEXTAREA, {
      type: UIComponentType.TEXTAREA,
      component: ({ config, value, onChange }: any) => (
        <textarea
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={config.placeholder}
          required={config.required}
          disabled={config.disabled}
          className={`form-textarea ${config.className || ''}`}
          style={config.style}
          rows={config.props?.rows || 4}
          {...config.inputProps}
        />
      ),
    }],
    
    [UIComponentType.NUMBER_INPUT, {
      type: UIComponentType.NUMBER_INPUT,
      component: ({ config, value, onChange }: any) => (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
          placeholder={config.placeholder}
          required={config.required}
          disabled={config.disabled}
          min={config.validation?.min}
          max={config.validation?.max}
          step={config.inputProps?.step}
          className={`form-input ${config.className || ''}`}
          style={config.style}
        />
      ),
    }],
    
    [UIComponentType.CHECKBOX, {
      type: UIComponentType.CHECKBOX,
      component: ({ config, value, onChange }: any) => (
        <label className={`form-checkbox ${config.className || ''}`} style={config.style}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={config.disabled}
          />
          <span>{config.label}</span>
        </label>
      ),
    }],
    
    [UIComponentType.SELECT, {
      type: UIComponentType.SELECT,
      component: ({ config, value, onChange }: any) => (
        <select
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          required={config.required}
          disabled={config.disabled}
          className={`form-select ${config.className || ''}`}
          style={config.style}
        >
          {!config.required && <option value="">-- Select --</option>}
          {config.selectProps?.options?.map((option: any, index: number) => (
            <option key={index} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      ),
    }],
    
    [UIComponentType.BUTTON, {
      type: UIComponentType.BUTTON,
      component: ({ config, onClick }: any) => (
        <button
          type={config.props?.type || 'button'}
          onClick={onClick || config.events?.onClick}
          disabled={config.disabled}
          className={`btn btn-${config.variant || 'primary'} btn-${config.size || 'md'} ${config.className || ''}`}
          style={config.style}
        >
          {config.buttonProps?.icon && (
            <span className="btn-icon">{config.buttonProps.icon}</span>
          )}
          {config.label}
        </button>
      ),
    }],
    
    [UIComponentType.TEXT, {
      type: UIComponentType.TEXT,
      component: ({ config }: any) => {
        const Tag = config.props?.variant === 'h1' ? 'h1' :
                   config.props?.variant === 'h2' ? 'h2' :
                   config.props?.variant === 'h3' ? 'h3' :
                   config.props?.variant === 'h4' ? 'h4' :
                   config.props?.variant === 'h5' ? 'h5' :
                   config.props?.variant === 'h6' ? 'h6' : 'p';
        
        return (
          <Tag
            className={`text-${config.props?.variant || 'body1'} ${config.className || ''}`}
            style={config.style}
          >
            {config.props?.content || config.label}
          </Tag>
        );
      },
    }],
    
    [UIComponentType.CARD, {
      type: UIComponentType.CARD,
      component: ({ config, children }: any) => (
        <div
          className={`card ${config.className || ''}`}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#ffffff',
            ...config.style,
          }}
        >
          {config.label && (
            <h3 className="card-title">{config.label}</h3>
          )}
          {children}
        </div>
      ),
    }],
    
    [UIComponentType.GROUP, {
      type: UIComponentType.GROUP,
      component: ({ config, children }: any) => (
        <div
          className={`group ${config.className || ''}`}
          style={{
            display: 'flex',
            flexDirection: config.layout?.type === LayoutType.HORIZONTAL ? 'row' : 'column',
            gap: config.layout?.gap || '8px',
            justifyContent: config.flexProps?.justify || 'flex-start',
            alignItems: config.flexProps?.align || 'stretch',
            ...config.style,
          }}
        >
          {children}
        </div>
      ),
    }],
    
    [UIComponentType.CONTAINER, {
      type: UIComponentType.CONTAINER,
      component: ({ config, children }: any) => (
        <div
          className={`container ${config.className || ''}`}
          style={{
            maxWidth: config.containerProps?.maxWidth || 'none',
            margin: config.containerProps?.centered ? '0 auto' : '0',
            padding: config.containerProps?.padded ? '24px' : '0',
            border: config.containerProps?.bordered ? '1px solid #e5e7eb' : 'none',
            borderRadius: config.containerProps?.bordered ? '8px' : '0',
            boxShadow: config.containerProps?.elevated ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
            ...config.style,
          }}
        >
          {children}
        </div>
      ),
    }],
    
    [UIComponentType.JSON_VIEWER, {
      type: UIComponentType.JSON_VIEWER,
      component: ({ config, data }: any) => (
        <pre
          className={`json-viewer ${config.className || ''}`}
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '4px',
            padding: '12px',
            overflow: 'auto',
            fontSize: '14px',
            fontFamily: 'monospace',
            ...config.style,
          }}
        >
          {JSON.stringify(data || config.data, null, 2)}
        </pre>
      ),
    }],
    
    [UIComponentType.BADGE, {
      type: UIComponentType.BADGE,
      component: ({ config }: any) => (
        <span
          className={`badge badge-${config.variant || 'secondary'} badge-${config.size || 'md'} ${config.className || ''}`}
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: '500',
            borderRadius: '4px',
            backgroundColor: config.variant === 'primary' ? '#3b82f6' :
                           config.variant === 'success' ? '#10b981' :
                           config.variant === 'warning' ? '#f59e0b' :
                           config.variant === 'error' ? '#ef4444' : '#6b7280',
            color: '#ffffff',
            ...config.style,
          }}
        >
          {config.label}
        </span>
      ),
    }],
  ]),
  
  defaults: {
    theme: {},
    spacing: {},
    typography: {},
    breakpoints: {},
  },
  
  validators: new Map(),
};

/**
 * Main UI Renderer Component
 */
export const UIRenderer: React.FC<UIRendererProps> = ({
  schema,
  data,
  onSubmit,
  onChange,
  componentLibrary = defaultComponentLibrary,
  className,
  style,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<FormSubmissionResult | null>(null);
  
  // Initialize form with react-hook-form
  const form = useForm({
    mode: schema.validation?.mode || 'onChange',
    reValidateMode: schema.validation?.reValidateMode || 'onChange',
    defaultValues: data || {},
  });
  
  const { handleSubmit, watch } = form;
  
  // Watch for form changes
  const watchedValues = watch();
  
  useEffect(() => {
    onChange?.(watchedValues);
  }, [watchedValues, onChange]);
  
  // Handle form submission
  const handleFormSubmit = useCallback(async (formData: any) => {
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      const result = await onSubmit(formData);
      setSubmitResult(result);
    } catch (error) {
      setSubmitResult({
        success: false,
        errors: [{
          field: 'general',
          message: error instanceof Error ? error.message : 'Submission failed',
        }],
        metadata: {
          submissionId: `error_${Date.now()}`,
          timestamp: new Date(),
          processingTime: 0,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit]);
  
  // Apply theme
  const themeStyles = useMemo(() => {
    if (!schema.theme?.customCSS) return {};
    
    // Create a style element for custom CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = schema.theme.customCSS;
    document.head.appendChild(styleElement);
    
    return {
      '--primary-color': schema.theme.primaryColor || '#3b82f6',
      '--accent-color': schema.theme.accentColor || '#10b981',
    };
  }, [schema.theme]);
  
  return (
    <FormProvider {...form}>
      <div
        className={`ui-renderer ${className || ''}`}
        style={{ ...themeStyles, ...style }}
        data-schema-id={schema.id}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <ComponentRenderer
            config={schema.layout}
            componentLibrary={componentLibrary}
          />
          
          {/* Submit result display */}
          {submitResult && (
            <div className={`submit-result ${submitResult.success ? 'success' : 'error'}`}>
              {submitResult.success ? (
                <div className="success-message">
                  ✅ Submitted successfully!
                  {submitResult.data && (
                    <ComponentRenderer
                      config={{
                        type: UIComponentType.JSON_VIEWER,
                        id: 'submit_result',
                        data: submitResult.data,
                      }}
                      componentLibrary={componentLibrary}
                    />
                  )}
                </div>
              ) : (
                <div className="error-message">
                  ❌ Submission failed:
                  {submitResult.errors?.map((error, index) => (
                    <div key={index} className="error-item">
                      {error.field !== 'general' && <strong>{error.field}:</strong>} {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </FormProvider>
  );
};

/**
 * Individual Component Renderer
 */
const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  config,
  data,
  onUpdate,
  componentLibrary = defaultComponentLibrary,
}) => {
  const form = useFormContext();
  
  // Check conditional rendering
  if (config.condition) {
    const dependentValue = form?.watch?.(config.condition.dependsOn);
    const shouldRender = evaluateCondition(dependentValue, config.condition);
    
    if (!shouldRender) {
      return null;
    }
  }
  
  // Skip hidden components
  if (config.hidden) {
    return null;
  }
  
  // Get renderer from component library
  const renderer = componentLibrary.renderers.get(config.type);
  if (!renderer) {
    throw new ComponentNotFoundError(config.type);
  }
  
  try {
    const Component = renderer.component;
    
    // Handle form fields
    if (isFormField(config)) {
      const fieldConfig = config as FormFieldConfig;
      
      return (
        <div className={`field field-${fieldConfig.type}`}>
          {fieldConfig.label && (
            <label htmlFor={fieldConfig.id} className="field-label">
              {fieldConfig.label}
              {fieldConfig.required && <span className="required">*</span>}
            </label>
          )}
          
          <Component
            config={fieldConfig}
            value={form?.watch?.(fieldConfig.name)}
            onChange={(value: any) => {
              form?.setValue?.(fieldConfig.name, value);
              onUpdate?.(value);
            }}
            error={form?.formState?.errors?.[fieldConfig.name]}
          />
          
          {fieldConfig.description && (
            <div className="field-description">{fieldConfig.description}</div>
          )}
          
          {fieldConfig.helpText && (
            <div className="field-help">{fieldConfig.helpText}</div>
          )}
          
          {form?.formState?.errors?.[fieldConfig.name] && (
            <div className="field-error">
              {form.formState.errors[fieldConfig.name]?.message}
            </div>
          )}
        </div>
      );
    }
    
    // Handle layout containers
    if (isLayoutContainer(config)) {
      const layoutConfig = config as LayoutContainerConfig;
      
      return (
        <Component
          config={layoutConfig}
          data={data}
          onUpdate={onUpdate}
        >
          {layoutConfig.children?.map((childConfig, index) => (
            <ComponentRenderer
              key={childConfig.id || index}
              config={childConfig}
              data={data}
              onUpdate={onUpdate}
              componentLibrary={componentLibrary}
            />
          ))}
        </Component>
      );
    }
    
    // Handle display components
    if (isDisplayComponent(config)) {
      const displayConfig = config as DisplayComponentConfig;
      
      return (
        <Component
          config={displayConfig}
          data={data || displayConfig.data}
          onUpdate={onUpdate}
        />
      );
    }
    
    // Handle interactive components
    if (isInteractiveComponent(config)) {
      const interactiveConfig = config as InteractiveComponentConfig;
      
      return (
        <Component
          config={interactiveConfig}
          onClick={interactiveConfig.events?.onClick}
          onSubmit={interactiveConfig.events?.onSubmit}
        />
      );
    }
    
    // Default component rendering
    return (
      <Component
        config={config}
        data={data}
        onUpdate={onUpdate}
      />
    );
    
  } catch (error) {
    console.error(`Error rendering component ${config.type}:`, error);
    
    throw new RenderingError(
      error instanceof Error ? error.message : 'Unknown rendering error',
      config.type,
      { config, data }
    );
  }
};

/**
 * Helper functions
 */
function isFormField(config: UIComponentConfig): boolean {
  return 'name' in config && typeof (config as any).name === 'string';
}

function isLayoutContainer(config: UIComponentConfig): boolean {
  return 'children' in config && Array.isArray((config as any).children);
}

function isDisplayComponent(config: UIComponentConfig): boolean {
  return 'data' in config || config.type === UIComponentType.JSON_VIEWER ||
         config.type === UIComponentType.TABLE || config.type === UIComponentType.MARKDOWN;
}

function isInteractiveComponent(config: UIComponentConfig): boolean {
  return config.type === UIComponentType.BUTTON || config.type === UIComponentType.LINK;
}

function evaluateCondition(value: any, condition: any): boolean {
  switch (condition.operator) {
    case 'equals':
      return value === condition.value;
    case 'not_equals':
      return value !== condition.value;
    case 'contains':
      return Array.isArray(value) ? value.includes(condition.value) : 
             String(value).includes(String(condition.value));
    case 'not_contains':
      return Array.isArray(value) ? !value.includes(condition.value) : 
             !String(value).includes(String(condition.value));
    case 'greater':
      return Number(value) > Number(condition.value);
    case 'less':
      return Number(value) < Number(condition.value);
    default:
      return true;
  }
}

/**
 * Hook for using the UI renderer
 */
export const useUIRenderer = (schema: UISchema) => {
  const [data, setData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = useCallback(async (formData: any): Promise<FormSubmissionResult> => {
    setIsSubmitting(true);
    
    try {
      // Default submission handler - can be overridden
      console.log('Form submitted:', formData);
      
      return {
        success: true,
        data: formData,
        metadata: {
          submissionId: `sub_${Date.now()}`,
          timestamp: new Date(),
          processingTime: Date.now(),
        },
      };
    } finally {
      setIsSubmitting(false);
    }
  }, []);
  
  const handleChange = useCallback((newData: any) => {
    setData(newData);
  }, []);
  
  return {
    data,
    isSubmitting,
    handleSubmit,
    handleChange,
    setData,
  };
};

export default UIRenderer;

// TODO: Implement proper validation with schema-based rules
// TODO: Add support for custom component libraries
// FIXME: Error boundaries should be more sophisticated
// TODO: Implement accessibility features (ARIA labels, keyboard navigation)
// TODO: Add support for themes and styling systems
// TODO: Implement proper internationalization
// HACK: Using inline styles for default components - should use CSS classes