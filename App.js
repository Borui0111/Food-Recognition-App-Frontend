import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const apiUrl = 'https://4767-2402-7500-a5a-71ae-5d58-90c9-4077-fa40.ngrok-free.app/foodapp/upload/'; // 食物辨識API
const foodDetailsApiUrl = 'https://db9a-2001-b400-e736-977a-1d67-9184-e23c-94e8.ngrok-free.app/foods/'; // 資料庫API

export default function App() {
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [loading, setLoading] = useState(false); // 等待狀態
  const [modalVisible, setModalVisible] = useState(false); // 彈出視窗
  const [foodDetails, setFoodDetails] = useState(null); // 食物詳細資訊

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要相機權限', '請授予應用程式相機權限以使用拍照功能');
      }
    })();
  }, []);

  const takePicture = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      handleImage(result);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      handleImage(result);
    }
  };

  const handleImage = async (result) => {
    console.log('handleImage - 選擇照片結果:', result);

    try {
      if (!result) {
        throw new Error('未選擇有效的照片');
      }

      let photoUri = '';

      if (result.uri) {
        photoUri = result.uri.startsWith('file://') ? result.uri.replace('file://', '') : result.uri;
      } else if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
        photoUri = result.assets[0].uri.startsWith('file://') ? result.assets[0].uri.replace('file://', '') : result.assets[0].uri;
      } else {
        throw new Error('無法獲取照片的 URI');
      }

      setLoading(true); // 啟動等待狀態
      setCapturedPhoto(photoUri);
      await recognizeFood(photoUri);
    } catch (error) {
      console.error('處理照片時出現錯誤:', error);
      Alert.alert('處理照片時出現錯誤', '請選擇有效的圖片');
    } finally {
      setLoading(false); // 結束等待狀態
    }
  };

  const recognizeFood = async (photoUri) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      });

      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('API 回應:', response.data);

      if (response.status === 200) {
        const result = response.data;
        console.log('API 回傳結果:', result);

        if (result.prediction && result.prediction.信心度 && result.prediction.食物類別) {
          setRecognitionResult(result.prediction);
          await fetchFoodDetails(result.prediction.食物類別);
        } else {
          setRecognitionResult({
            食物類別: '無法辨識',
            信心度: 0,
          });
          await fetchFoodDetails('27');
        }
      } else {
        console.error('辨識食物失敗。HTTP 狀態:', response.status);
        Alert.alert('辨識食物失敗', '請稍後重試');
      }
    } catch (error) {
      console.error('辨識過程中出現錯誤:', error);
      Alert.alert('辨識過程中出現錯誤', '請稍後重試');
    } finally {
      setLoading(false); // 結束等待狀態
    }
  };

  const fetchFoodDetails = async (foodCategory) => {
    try {
      const response = await axios.get(`${foodDetailsApiUrl}${foodCategory}/`);
      const foodDetails = response.data;
      setFoodDetails(foodDetails);
      setModalVisible(true); // 開啟彈出視窗
    } catch (error) {
      console.error('獲取食物詳細資訊時出現錯誤:', error);
      Alert.alert('獲取食物詳細資訊時出現錯誤', '請稍後重試');
    }
  };

  const closeModal = () => {
    setModalVisible(false); // 關閉彈出視窗
    setFoodDetails(null); // 清除食物詳細資訊
  };

  return (
    <View style={styles.container}> 
      <View style={styles.titleContainer}>
        <Text style={styles.title}>食物辨識APP</Text>
      </View>

      <TouchableOpacity onPress={takePicture} style={styles.button}>
        <Text style={styles.buttonText}>拍照</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={pickImage} style={styles.button}>
        <Text style={styles.buttonText}>從相簿中選擇</Text>
      </TouchableOpacity>

      <View style={styles.imageContainer}>
        {capturedPhoto && (
          <>
            <Text style={styles.imageText}>選擇的照片:</Text>
            <Image source={{ uri: capturedPhoto }} style={styles.image} />
          </>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : recognitionResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>辨識結果:</Text>
          <Text>{`食物種類: ${recognitionResult.食物類別}`}</Text>
          <Text>{`信心度: ${recognitionResult.信心度}`}</Text>
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {foodDetails && (
              <>
                <Text style={styles.modalText}>食物詳細資訊:</Text>
                <Text>{`食物名稱: ${foodDetails.name}`}</Text>
                <Text>{`熱量: ${foodDetails.kcal} 大卡`}</Text>
                <Text>{`描述: ${foodDetails.description}`}</Text>
              </>
            )}
            <Pressable onPress={closeModal}>
              <Text style={styles.closeButton}>關閉</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    position: 'absolute',
    top: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFC0CB', 
  },
  button: {
    backgroundColor: '#add8e6',
    padding: 10,
    borderRadius: 5,
    margin: 10,
  },
  buttonText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  imageText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginVertical: 10,
  },
  resultContainer: {
    position: 'absolute',
    bottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 10,
    width: '80%',
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  closeButton: {
    fontSize: 16,
    color: 'blue',
    marginTop: 10,
    textAlign: 'center',
  },
});
