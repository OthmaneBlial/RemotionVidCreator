import { Config } from "@remotion/cli/config";

// Output format
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Performance optimizations
Config.setConcurrency(4); // Use 4 CPU cores for parallel rendering
Config.setCrf(23); // Balance between quality (lower) and file size (higher)

// Quality settings
Config.setPixelFormat("yuv420p"); // Maximum compatibility
Config.setCodec("h264"); // H.264 for best compatibility

// Browser optimizations
Config.setChromiumOpenGlRenderer("egl"); // Better GPU performance on Linux
Config.setChromiumDisableWebSecurity(true); // Allow cross-origin images
