import {
  UmbBlockGridTypeAreaType,
  UmbBlockGridLayoutModel,
  UmbBlockGridLayoutAreaItemModel
} from "@umbraco-cms/backoffice/block-grid";

export interface BlockContext {
  unique: string;
  documentTypeUnique: string;
  contentUdi: string;
  /** Key of the block's layout item; tells apart several uses of the same element (Umbraco 19). */
  layoutKey: string;
  /** The block shows a Library (reusable) element, so the manager has no local content for it. */
  isExternalContent: boolean;
  settingsUdi: string;
  blockEditorAlias: string;
  culture: string;
  workspaceEditContentPath: string;
  contentElementTypeAlias: string;
  contentElementTypeKey: string;
  blockIndex: number;
}

export interface BlockGridContext extends BlockContext {
  areas: UmbBlockGridTypeAreaType[];
  layout?: UmbBlockGridLayoutModel | undefined;
  layoutAreas?: UmbBlockGridLayoutAreaItemModel[];
}

export interface BlockListContext extends BlockContext {}