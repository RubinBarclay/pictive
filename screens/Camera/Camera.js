import { useEffect, useRef, useState, useContext } from "react";
import { Camera as CameraComponent } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import styles from "./Camera.styles";
import config from "../../config.json";
import CameraTaskbar from "../../components/CameraTaskbar";
import LanguageInfoContext from "../../context/languageInfoContext";
import { useIsFocused } from "@react-navigation/core";
import { Feather } from "@expo/vector-icons";

function Camera({ navigation }) {
  const [cameraAccess, setCameraAccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [picture, setPicture] = useState(null);
  const [base64, setBase64] = useState(null);
  const [identifiedObject, setIdentifiedObject] = useState("");
  const [translatedObject, setTranslatedObject] = useState("");
  const [flashMode, setFlashMode] = useState(
    CameraComponent.Constants.FlashMode.off
  );
  const [cameraType, setCameraType] = useState(
    CameraComponent.Constants.Type.back
  );

  const { languageInfo } = useContext(LanguageInfoContext);
  const cameraRef = useRef(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    requestCameraAccess();
  }, []);

  const requestCameraAccess = async () => {
    const { status } = await CameraComponent.requestCameraPermissionsAsync();
    setCameraAccess(status === "granted");
  };

  const takePicture = async () => {
    const picture = await cameraRef.current.takePictureAsync();
    const manipulatedPicture = await ImageManipulator.manipulateAsync(
      picture.uri,
      [],
      { base64: true, compress: 0.65, format: "jpeg" }
    );
    setPicture(picture);
    setBase64(manipulatedPicture.base64);
    setShowPreview(true);
  };

  const closePreview = () => {
    setPicture(null);
    setShowPreview(false);
    setIdentifiedObject("");
  };

  const callGoogleCloudVision = async () => {
    const response = await fetch(
      config.googleCloud.cloudVisionApi + config.googleCloud.apiKey,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64,
              },
              features: [{ type: "LABEL_DETECTION", maxResults: 1 }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    setIdentifiedObject(data.responses[0].labelAnnotations[0].description);
    translateWord(data.responses[0].labelAnnotations[0].description);
  };

  const translateWord = async (identifiedObject) => {
    const baseURL = config.googleCloud.translateApi;
    const params = `${config.googleCloud.apiKey}&q=${identifiedObject}&target=${languageInfo.to[1]}&source=${languageInfo.from[1]}`;
    const response = await fetch(baseURL + params, { method: "POST" });

    const data = await response.json();
    setTranslatedObject(data.data.translations[0].translatedText);
  };

  const toggleCameraTypeHandler = () => {
    setCameraType(
      cameraType === CameraComponent.Constants.Type.back
        ? CameraComponent.Constants.Type.front
        : CameraComponent.Constants.Type.back
    );
  };

  const toggleFlashHandler = () => {
    setFlashMode(
      flashMode === CameraComponent.Constants.FlashMode.off
        ? CameraComponent.Constants.FlashMode.on
        : CameraComponent.Constants.FlashMode.off
    );
  };

  return cameraAccess ? (
    <View style={styles.container}>
      {showPreview && picture ? (
        <ImageBackground
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
          }}
          source={picture}
        >
          {identifiedObject !== "" && translatedObject !== "" && (
            <>
              <Text
                style={{
                  fontSize: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: "#222",
                  borderRadius: 8,
                }}
              >
                {identifiedObject}
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: "#222",
                  borderRadius: 8,
                  marginTop: 12,
                }}
              >
                {translatedObject}
              </Text>
            </>
          )}
        </ImageBackground>
      ) : isFocused ? ( // isFocused ensures the camera mounts when navigating
        <>
          <CameraComponent
            style={styles.camera}
            ref={cameraRef}
            autoFocus="on"
            type={cameraType}
            flashMode={flashMode}
          />
          <TouchableOpacity
            style={styles.flashBtn}
            onPress={toggleFlashHandler}
          >
            {flashMode === CameraComponent.Constants.FlashMode.off ? (
              <Feather name="zap" size={24} />
            ) : (
              <Feather name="zap-off" size={24} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.flipBtn}
            onPress={toggleCameraTypeHandler}
          >
            <Feather name="refresh-ccw" size={24} />
          </TouchableOpacity>
        </>
      ) : null}
      <CameraTaskbar
        navigation={navigation}
        showPreview={showPreview}
        takePicture={takePicture}
        closePreview={closePreview}
        identify={callGoogleCloudVision}
        languageInfo={languageInfo}
      />
      <StatusBar style="auto" />
    </View>
  ) : (
    <View style={styles.container}>
      <Text>This app requires your camera in order to work</Text>
      <TouchableOpacity
        style={styles.requestPermission}
        onPress={requestCameraAccess}
      >
        <Text>Allow camera access</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}

export default Camera;
