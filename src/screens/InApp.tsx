import React from 'react';
import {View, FlatList, Alert, Platform} from 'react-native';
import {List, Text, Button, ActivityIndicator} from 'react-native-paper';

import AsyncStorage from '@react-native-async-storage/async-storage';

// in-app
import {
  withIAPContext,
  useIAP,
  getAvailablePurchases,
  requestSubscription,
  validateReceiptIos,
  initConnection,
  finishTransaction,
  PurchaseError,
  clearTransactionIOS,
} from 'react-native-iap';

const errorLog = ({message, error}: {message: string; error: unknown}) => {
  console.error('An error happened', message, error);
};

function InApp({navigation}: {navigation: any}) {
  // in-app hooks
  const {products, currentPurchase, currentPurchaseError, getProducts} =
    useIAP();

  // useState
  const [restoreLoading, setRestoreLoading] = React.useState(false);
  const [buyLoading, setBuyLoading] = React.useState(false);

  React.useEffect(() => {
    _getProducts();
  }, []);

  React.useEffect(() => {
    // ... listen to currentPurchaseError, to check if any error happened
    console.log('currentPurchaseError');
    console.log(currentPurchaseError);
  }, [currentPurchaseError]);

  React.useEffect(() => {
    // ... listen to currentPurchase, to check if the purchase went through
    console.log('currentPurchase');
    console.log('currentPurchase---', currentPurchase);
    if (currentPurchase) {
      AsyncStorage.setItem('receipt', currentPurchase?.transactionReceipt);
    }
  }, [currentPurchase]);

  // selected product for subscription
  type DataType = {
    productId: string;
  };
  const [selectedProduct, setProduct] = React.useState<DataType | undefined>(
    undefined,
  );
  const _selectProduct = ({item}: any) => {
    setProduct(item);
  };

  // get iOS in-app purchase product list
  const _getProducts = async () => {
    // ... listen to currentPurchaseError, to check if any error happened
    try {
      await initConnection();
      /**
       * WARNING This line should not be included in production code
       * This call will call finishTransaction in all pending purchases
       * on every launch, effectively consuming purchases that you might
       * not have verified the receipt or given the consumer their product
       *
       * TL;DR you will no longer receive any updates from Apple on
       * every launch for pending purchases
       */
      await clearTransactionIOS();
      console.log('clearTransactionIOS');
      getProducts({
        skus: [
          'com.salontechnologies.PersonalSalonAssistant.autoRenewableMonthly',
          'com.salontechnologies.PersonalSalonAssistant.autoRenewableYearly',
        ],
      });
      console.log('getProducts');
    } catch (error) {
      if (error instanceof PurchaseError) {
        errorLog({message: `[${error.code}]: ${error.message}`, error});
      } else {
        errorLog({message: 'finishTransaction', error});
      }
    }
  };

  // restore product when user re-install app or move to other device
  const _restorePurchse = async () => {
    setRestoreLoading(true);
    await initConnection();
    await getAvailablePurchases()
      .then(purchases => {
        let receipt = purchases[0]?.transactionReceipt;
        if (Platform.OS === 'android' && purchases[0]?.purchaseToken) {
          receipt = purchases[0]?.purchaseToken;
        }
        console.debug('receipt', receipt);
        AsyncStorage.setItem('receipt', receipt);
        _getReceiptData(receipt);
        setRestoreLoading(false);
      })
      .catch(err => {
        console.error(err);
        setRestoreLoading(false);
      });
  };

  // subscribe selected product
  const _subscribeProduct = async () => {
    if (selectedProduct?.productId == undefined) {
      Alert.alert('Aler!', 'Please select subscription type.');
      return;
    }
    setBuyLoading(true);
    await requestSubscription({sku: selectedProduct?.productId})
      .then(result => {
        console.debug('requestSubscription -----', result);
        const receipt = String(result?.transactionReceipt);
        AsyncStorage.setItem('receipt', receipt);
        _getReceiptData(receipt);
        setBuyLoading(false);
      })
      .catch(err => {
        console.error(err);
        setBuyLoading(false);
      });
    console.log('_buyProduct', selectedProduct?.productId);
  };

  // get recipt data for iOS
  const _getReceiptData = async (receipt: any) => {
    const receiptBody: any = {
      'receipt-data': receipt,
      password: '94827f808b414ce290bbfd2c25709134',
    };

    await validateReceiptIos({receiptBody: receiptBody, isTest: true})
      .then(result => {
        console.debug('_getReceiptData -----', result);
        const strSubExpDate = result.latest_receipt_info[0]?.expires_date_ms;
        const subExpDate = parseInt(strSubExpDate);

        AsyncStorage.setItem('subexpdate', strSubExpDate);

        const subExpDateObj = new Date(subExpDate);
        console.log('subExpDateObj ----', subExpDateObj);

        const curtDate = Date.now();
        const curtDateObj = new Date(curtDate);
        console.log('curtDateObj ----', curtDateObj);

        const isExpired = curtDateObj.getTime() > subExpDateObj.getTime();
        console.log('isExpired ----', isExpired);

        !isExpired ? navigation?.goBack() : null;
      })
      .catch(err => {
        console.error(err);
      });
  };

  const [ownedSubscriptions, setOwnedSubscriptions] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    console.log(JSON.stringify(ownedSubscriptions));
  }, [ownedSubscriptions]);

  React.useEffect(() => {
    const checkCurrentPurchase = async () => {
      try {
        if (currentPurchase?.productId) {
          await finishTransaction({
            purchase: currentPurchase,
            isConsumable: true,
          });

          setOwnedSubscriptions(prev => [...prev, currentPurchase?.productId]);
        }
      } catch (error) {
        if (error instanceof PurchaseError) {
          errorLog({message: `[${error.code}]: ${error.message}`, error});
        } else {
          errorLog({message: 'handleBuyProduct', error});
        }
      }
    };

    checkCurrentPurchase();
  }, [currentPurchase, finishTransaction]);

  const RenderItem = ({item}: any) => {
    return (
      <List.Item
        style={{
          backgroundColor:
            item?.productId == selectedProduct?.productId
              ? '#cccccc'
              : 'transparent',
        }}
        title={item?.title}
        description={item?.description}
        right={props => (
          <Text variant="titleSmall">{item?.localizedPrice}</Text>
        )}
        onPress={() => _selectProduct({item})}
      />
    );
  };

  if (products?.length <= 0) {
    return (
      <View style={{flex: 1, justifyContent: 'center'}}>
        <ActivityIndicator animating={true} />
      </View>
    );
  }

  return (
    <View>
      {products?.length > 0 && (
        <FlatList
          data={products}
          renderItem={({item}) => <RenderItem item={item} />}
          keyExtractor={item => item.productId}
        />
      )}
      <View style={{flexDirection: 'row', justifyContent: 'space-around'}}>
        <Button
          mode="contained"
          style={{margin: 20}}
          loading={restoreLoading}
          onPress={() => _restorePurchse()}>
          Restore
        </Button>
        <Button
          mode="contained"
          style={{margin: 20}}
          loading={buyLoading}
          onPress={() => _subscribeProduct()}>
          Buy
        </Button>
      </View>
    </View>
  );
}

export default withIAPContext(InApp);
