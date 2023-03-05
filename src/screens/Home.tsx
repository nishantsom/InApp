import React from 'react';

import {View} from 'react-native';
import {Text, ActivityIndicator} from 'react-native-paper';

// in-app purchase
import {withIAPContext} from 'react-native-iap';

// custom hooks for get subscription
import useSubscription from '../hooks/useSubscription';

function Home({navigation}: {navigation: any}) {
  // get in-app purchase status
  const [isExpired, loading] = useSubscription();

  React.useEffect(() => {
    if (isExpired) {
      navigation.navigate('InApp');
    }
  }, [isExpired]);

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center'}}>
        <ActivityIndicator animating={true} />
      </View>
    );
  }

  return (
    <View style={{flex: 1, justifyContent: 'center'}}>
      <Text style={{textAlign: 'center'}}>DASHBOARD</Text>
    </View>
  );
}

export default withIAPContext(Home);
