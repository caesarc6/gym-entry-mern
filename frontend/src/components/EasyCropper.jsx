/**
 * Isolated entry for react-easy-crop so FileUploader can lazy-load it
 * (and its CSS) only when the user opens the crop step.
 */
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

export default Cropper;
