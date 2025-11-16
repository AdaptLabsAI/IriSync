/**
 * Figma Types Helper
 * 
 * Basic TypeScript types for working with Figma data
 * received from AI tools using the Figma MCP server.
 * 
 * These types help with AI-generated code that references
 * Figma frames, components, and design tokens.
 */

/**
 * Basic Figma frame/node information
 */
export interface FigmaFrameSummary {
  id: string;
  name: string;
  width: number;
  height: number;
}

/**
 * Figma component information
 */
export interface FigmaComponent {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  type: 'COMPONENT' | 'COMPONENT_SET';
}

/**
 * Figma color information
 */
export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Figma text style information
 */
export interface FigmaTextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
}

/**
 * Figma layout constraints
 */
export interface FigmaConstraints {
  horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
}

/**
 * Figma auto-layout properties
 */
export interface FigmaAutoLayout {
  mode: 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode: 'FIXED' | 'AUTO';
  counterAxisSizingMode: 'FIXED' | 'AUTO';
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX';
}

/**
 * Generic Figma node with common properties
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  width: number;
  height: number;
  x?: number;
  y?: number;
  constraints?: FigmaConstraints;
  layoutAlign?: 'INHERIT' | 'STRETCH' | 'MIN' | 'CENTER' | 'MAX';
  layoutGrow?: number;
}
