import {
  UmbBlockGridTypeAreaType,
  UmbBlockGridLayoutModel,
  UmbBlockGridLayoutAreaItemModel
} from "@umbraco-cms/backoffice/block-grid";

export interface BlockContext {
  unique: string;
  parentUnique: string;
  documentTypeUnique: string;
  contentUdi: string;
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