module Main where

import Data.ByteString qualified as BS
import Data.ByteString.Builder qualified as BSB
import Data.Text qualified as T
import Data.Text.IO qualified as T
import Data.Text.Lazy qualified as TL
import Data.Text.Lazy.Encoding qualified as TLE
import Development.Shake hiding ((~>))
import Development.Shake.Command
import Development.Shake.FilePath
import Development.Shake.Util
import Djot
import Text.Mustache

builderToText :: BSB.Builder -> T.Text
builderToText = TL.toStrict . TLE.decodeUtf8 . BSB.toLazyByteString

djotToHtml :: FilePath -> IO T.Text
djotToHtml srcPath = do
  src <- BS.readFile srcPath
  case parseDoc (ParseOptions NoSourcePos) src of
    Left msg -> do
      print ("Error while parsing " <> srcPath <> ":\n" <> msg)
      pure "(error)"
    Right d -> do
      pure $ builderToText $ renderHtml (RenderOptions False) d

buildPage :: Template -> FilePath -> FilePath -> IO ()
buildPage template srcPath outPath = do
  body <- djotToHtml srcPath
  T.writeFile outPath (substituteValue template (object ["body" ~> body]))

shakeMain :: Template -> IO ()
shakeMain mainTemplate = shakeArgs shakeOptions{shakeFiles="_build"} $ do
  phony "build" $ do
    djs <- getDirectoryFiles "src" ["*.dj"]
    let htmls = ["_build" </> dj -<.> "html" | dj <- djs]
    need htmls
    staticOrig <- getDirectoryFiles "src/static" ["//*"]
    let statics = ["_build/static" </> st | st <- staticOrig ]
    need statics

  phony "clean" $ do
    removeFilesAfter "_build" ["//*"]

  "_build/static//*" %> \out -> do
    let orig = "src/" </> (dropDirectory1 out)
    copyFile' orig out
  
  "_build/*.html" %> \out -> do
    need ["templates/main.mustache"]
    let dj = "src" </> (dropDirectory1 out) -<.> ".dj"
    liftIO $ buildPage mainTemplate dj out

main :: IO ()
main = do
  let templateDirs = ["./templates"]
  let mainTemplateName = "main.mustache"

  mainTemplate <- automaticCompile templateDirs mainTemplateName

  case mainTemplate of
    Left err -> print err
    Right template -> shakeMain template
